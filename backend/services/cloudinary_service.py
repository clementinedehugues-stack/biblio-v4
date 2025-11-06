"""Cloudinary service for persistent file storage."""

from __future__ import annotations

import io
from pathlib import Path
from typing import BinaryIO

import cloudinary
import cloudinary.uploader
from PIL import Image

from ..core.config import settings


def _configure_cloudinary() -> None:
    """Configure Cloudinary with credentials from settings."""
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


def upload_pdf(file: BinaryIO, book_id: str) -> str:
    """
    Upload a PDF file to Cloudinary.
    
    Args:
        file: Binary file object containing the PDF
        book_id: UUID of the book as string
        
    Returns:
        public_id: The Cloudinary public ID for the uploaded file
    """
    _configure_cloudinary()
    
    result = cloudinary.uploader.upload(
        file,
        resource_type="raw",  # PDFs are uploaded as raw files
        public_id=f"biblio/pdfs/{book_id}",
        overwrite=True,
        invalidate=True,
    )
    
    return result["public_id"]


def upload_thumbnail(image: Image.Image, book_id: str) -> str:
    """
    Upload a thumbnail image to Cloudinary.
    
    Args:
        image: PIL Image object
        book_id: UUID of the book as string
        
    Returns:
        public_id: The Cloudinary public ID for the uploaded thumbnail
    """
    _configure_cloudinary()
    
    # Convert PIL Image to bytes
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format='JPEG', quality=85)
    img_byte_arr.seek(0)
    
    result = cloudinary.uploader.upload(
        img_byte_arr,
        resource_type="image",
        public_id=f"biblio/thumbnails/{book_id}",
        overwrite=True,
        invalidate=True,
        transformation=[
            {"width": 300, "height": 400, "crop": "fill"},
            {"quality": "auto:good"},
        ],
    )
    
    return result["public_id"]


def get_pdf_url(public_id: str) -> str:
    """
    Get the secure URL for a PDF stored on Cloudinary.
    
    Args:
        public_id: The Cloudinary public ID
        
    Returns:
        Secure URL to download the PDF
    """
    _configure_cloudinary()
    
    return cloudinary.CloudinaryResource(public_id, resource_type="raw").build_url(
        secure=True,
        sign_url=True,
    )


def get_thumbnail_url(public_id: str) -> str:
    """
    Get the secure URL for a thumbnail stored on Cloudinary.
    
    Args:
        public_id: The Cloudinary public ID
        
    Returns:
        Secure URL to the thumbnail image
    """
    _configure_cloudinary()
    
    return cloudinary.CloudinaryResource(public_id).build_url(
        secure=True,
        transformation=[
            {"width": 300, "height": 400, "crop": "fill"},
            {"quality": "auto:good"},
        ],
    )


def delete_file(public_id: str, resource_type: str = "raw") -> bool:
    """
    Delete a file from Cloudinary.
    
    Args:
        public_id: The Cloudinary public ID
        resource_type: Type of resource ("raw" for PDFs, "image" for thumbnails)
        
    Returns:
        True if deletion was successful
    """
    _configure_cloudinary()
    
    result = cloudinary.uploader.destroy(public_id, resource_type=resource_type, invalidate=True)
    return result.get("result") == "ok"


def stream_pdf(public_id: str) -> bytes:
    """
    Download PDF content from Cloudinary for streaming.
    
    Args:
        public_id: The Cloudinary public ID
        
    Returns:
        PDF file content as bytes
    """
    import httpx

    url = get_pdf_url(public_id)
    with httpx.Client() as client:
        response = client.get(url)
        response.raise_for_status()
        return response.content
