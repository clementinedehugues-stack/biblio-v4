from __future__ import annotations

import os
import sys
import uuid
from typing import Any

import httpx


API_BASE = os.environ.get("API_BASE", "http://localhost:8000")


DUMMY_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 50 150 Td (Hello PDF) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000106 00000 n \n0000000175 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n244\n%%EOF\n"


def _post_json(client: httpx.Client, path: str, json: dict[str, Any], headers: dict[str, str] | None = None) -> httpx.Response:
    return client.post(f"{API_BASE}{path}", json=json, headers=headers)


def _get(client: httpx.Client, path: str, headers: dict[str, str] | None = None, params: dict[str, Any] | None = None) -> httpx.Response:
    return client.get(f"{API_BASE}{path}", headers=headers, params=params)


def main() -> int:
    with httpx.Client(timeout=15.0) as client:
        # 1) Ensure admin exists; if creation fails, proceed to login
        admin_payload = {
            "username": "superadmin",
            "password": "AdminPass123",
            "full_name": "Super Admin",
            "role": "admin",
        }
        r = _post_json(client, "/auth/create", admin_payload)
        if r.status_code not in (201, 400, 403):
            print("auth/create unexpected:", r.status_code, r.text)
            return 1

        r = _post_json(client, "/auth/login", {"username": admin_payload["username"], "password": admin_payload["password"]})
        if r.status_code != 200:
            print("auth/login failed:", r.status_code, r.text)
            return 1
        token = r.json().get("access_token", "")
        if not token:
            print("missing access token")
            return 1
        headers = {"Authorization": f"Bearer {token}"}

        # 2) Categories: create and list
        r = _post_json(client, "/categories/", {"name": "history"}, headers=headers)
        if r.status_code not in (201, 400):
            print("create category failed:", r.status_code, r.text)
            return 1
        r = _get(client, "/categories/")
        if r.status_code != 200:
            print("list categories failed:", r.status_code, r.text)
            return 1

        # 3) Create a book
        book_payload = {
            "title": "The Archivist",
            "author": "A. Keeper",
            "description": "A tale about ancient archives.",
            "cover_image_url": "https://example.com/archivist.png",
            "category": "history",
            "tags": ["archive", "library"],
            "language": "EN",
        }
        r = _post_json(client, "/books/", book_payload, headers=headers)
        if r.status_code != 201:
            print("create book failed:", r.status_code, r.text)
            return 1
        book = r.json()
        book_id = book.get("id")
        if not book_id:
            print("missing book id")
            return 1

        # 4) Add a comment
        r = _post_json(client, f"/books/{book_id}/comments/", {"rating": 5, "content": "Great book!"}, headers=headers)
        if r.status_code != 201:
            print("add comment failed:", r.status_code, r.text)
            return 1

        # 5) Upload a document for the book
        files = {"file": ("archive.pdf", DUMMY_PDF_BYTES, "application/pdf")}
        data = {"book_id": book_id}
        r = client.post(f"{API_BASE}/documents/upload", headers=headers, files=files, data=data)
        if r.status_code != 201:
            print("upload document failed:", r.status_code, r.text)
            return 1

        # 6) Verify the book now points to the uploaded file and it's retrievable
        r = _get(client, f"/books/{book_id}")
        if r.status_code != 200:
            print("read book failed:", r.status_code, r.text)
            return 1
        bk = r.json()
        if not bk.get("has_document"):
            print("book does not report stored document")
            return 1
        stream_endpoint = bk.get("stream_endpoint")
        if not stream_endpoint:
            print("book missing stream endpoint")
            return 1

        token_resp = client.post(f"{API_BASE}/books/{book_id}/stream-token", headers=headers)
        if token_resp.status_code != 200:
            print("stream token request failed:", token_resp.status_code, token_resp.text)
            return 1
        token_payload = token_resp.json()
        token_value = token_payload.get("token")
        if not token_value:
            print("missing stream token")
            return 1

        rf = client.get(f"{API_BASE}{stream_endpoint}", params={"token": token_value})
        if rf.status_code != 200:
            print("document stream failed:", rf.status_code)
            return 1
        if rf.content != DUMMY_PDF_BYTES:
            print("streamed content mismatch")
            return 1

        # 7) Try a search (non-fatal if extraction yields no text)
        r = _get(client, "/documents/search", params={"query": "Hello"})
        if r.status_code == 200:
            results = r.json()
            if any(item.get("id") == book_id for item in results):
                print("Search returned the created book (indexing OK)")
        else:
            print("search endpoint returned:", r.status_code)

        print("OK: end-to-end verification passed")
        return 0


if __name__ == "__main__":
    sys.exit(main())
