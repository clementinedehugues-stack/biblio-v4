"""Unit tests for service layer (auth, books, documents)."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from backend.models.base import Base
from backend.models.user import User, UserRole
from backend.models.book import Book
from backend.services import auth, user_service, books, documents


@pytest.fixture
async def test_db_session():
    """Create an in-memory test database session."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
        class_=AsyncSession,
    )

    async with session_maker() as session:
        yield session


class TestAuthService:
    """Tests for authentication service."""

    @pytest.mark.asyncio
    async def test_get_user_by_username(self, test_db_session):
        """Test retrieving user by username."""
        # Create user
        user = User(
            username="john",
            hashed_password=user_service.hash_password("pass"),
            full_name="John Doe",
            role=UserRole.USER,
        )
        test_db_session.add(user)
        await test_db_session.commit()

        # Retrieve
        found = await auth.get_user_by_username(test_db_session, "john")
        assert found is not None
        assert found.username == "john"

    @pytest.mark.asyncio
    async def test_get_user_by_username_not_found(self, test_db_session):
        """Test retrieving non-existent user."""
        found = await auth.get_user_by_username(test_db_session, "nonexistent")
        assert found is None

    @pytest.mark.asyncio
    async def test_authenticate_user_success(self, test_db_session):
        """Test successful authentication."""
        # Create user
        user = User(
            username="testuser",
            hashed_password=user_service.hash_password("password123"),
            full_name="Test User",
            role=UserRole.USER,
        )
        test_db_session.add(user)
        await test_db_session.commit()

        # Authenticate
        authenticated = await auth.authenticate_user(
            test_db_session, "testuser", "password123"
        )
        assert authenticated is not None
        assert authenticated.username == "testuser"

    @pytest.mark.asyncio
    async def test_authenticate_user_wrong_password(self, test_db_session):
        """Test authentication with wrong password."""
        user = User(
            username="testuser",
            hashed_password=user_service.hash_password("correct"),
            full_name="Test",
            role=UserRole.USER,
        )
        test_db_session.add(user)
        await test_db_session.commit()

        authenticated = await auth.authenticate_user(
            test_db_session, "testuser", "wrong"
        )
        assert authenticated is None

    @pytest.mark.asyncio
    async def test_authenticate_user_not_found(self, test_db_session):
        """Test authentication for non-existent user."""
        authenticated = await auth.authenticate_user(
            test_db_session, "notfound", "anypass"
        )
        assert authenticated is None

    @pytest.mark.asyncio
    async def test_get_user_by_id(self, test_db_session):
        """Test retrieving user by ID."""
        user = User(
            username="user",
            hashed_password=user_service.hash_password("pass"),
            full_name="User",
            role=UserRole.USER,
        )
        test_db_session.add(user)
        await test_db_session.commit()

        found = await auth.get_user_by_id(test_db_session, user.id)
        assert found is not None
        assert found.id == user.id


class TestUserService:
    """Tests for user service."""

    def test_hash_password(self):
        """Test password hashing."""
        password = "mysecretpassword"
        hashed = user_service.hash_password(password)
        assert hashed != password
        assert len(hashed) > 0

    def test_verify_password_success(self):
        """Test password verification success."""
        password = "mypassword"
        hashed = user_service.hash_password(password)
        assert user_service.verify_password(password, hashed) is True

    def test_verify_password_failure(self):
        """Test password verification failure."""
        password = "mypassword"
        hashed = user_service.hash_password(password)
        assert user_service.verify_password("wrongpassword", hashed) is False

    def test_hash_password_different_each_time(self):
        """Test that hashing same password produces different hashes."""
        password = "test"
        hash1 = user_service.hash_password(password)
        hash2 = user_service.hash_password(password)
        assert hash1 != hash2  # Different due to salt
        assert user_service.verify_password(password, hash1) is True
        assert user_service.verify_password(password, hash2) is True


class TestBooksService:
    """Tests for books service."""

    @pytest.mark.asyncio
    async def test_list_books_empty(self, test_db_session):
        """Test listing books when none exist."""
        result = await books.list_books(test_db_session)
        assert result == []

    @pytest.mark.asyncio
    async def test_create_book(self, test_db_session):
        """Test creating a book."""
        from backend.schemas.book import BookCreate
        from backend.models.book import Language

        book_data = BookCreate(
            title="Test Book",
            author="Test Author",
            category="Test",
            language=Language.EN,
            description="Test description",
        )

        created = await books.create_book(test_db_session, book_data)
        assert created.title == "Test Book"
        assert created.author == "Test Author"
        assert created.id is not None

    @pytest.mark.asyncio
    async def test_get_book(self, test_db_session):
        """Test retrieving a book by ID."""
        from backend.models.book import Language

        book = Book(
            title="Test",
            author="Author",
            category="Test",
            language=Language.EN,
            description="Test",
        )
        test_db_session.add(book)
        await test_db_session.commit()

        found = await books.get_book(test_db_session, book.id)
        assert found is not None
        assert found.title == "Test"

    @pytest.mark.asyncio
    async def test_get_book_not_found(self, test_db_session):
        """Test retrieving non-existent book."""
        fake_id = uuid.uuid4()
        found = await books.get_book(test_db_session, fake_id)
        assert found is None

    @pytest.mark.asyncio
    async def test_filter_books_by_category(self, test_db_session):
        """Test filtering books by category."""
        from backend.models.book import Language

        # Create books with different categories
        b1 = Book(
            title="Python",
            author="Author",
            category="Programming",
            language=Language.EN,
            description="Python",
        )
        b2 = Book(
            title="Novel",
            author="Author",
            category="Fiction",
            language=Language.EN,
            description="Fiction",
        )
        test_db_session.add(b1)
        test_db_session.add(b2)
        await test_db_session.commit()

        # Filter
        result = await books.list_books(test_db_session, category="Programming")
        assert len(result) == 1
        assert result[0].title == "Python"

    @pytest.mark.asyncio
    async def test_filter_books_by_author(self, test_db_session):
        """Test filtering by author."""
        from backend.models.book import Language

        b1 = Book(
            title="Book1",
            author="Stephen King",
            category="Fiction",
            language=Language.EN,
            description="Book1",
        )
        b2 = Book(
            title="Book2",
            author="John Grisham",
            category="Fiction",
            language=Language.EN,
            description="Book2",
        )
        test_db_session.add(b1)
        test_db_session.add(b2)
        await test_db_session.commit()

        result = await books.list_books(test_db_session, author="Stephen King")
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_filter_books_by_language(self, test_db_session):
        """Test filtering by language."""
        from backend.models.book import Language

        b1 = Book(
            title="English",
            author="Author",
            category="Test",
            language=Language.EN,
            description="English",
        )
        b2 = Book(
            title="French",
            author="Author",
            category="Test",
            language=Language.FR,
            description="French",
        )
        test_db_session.add(b1)
        test_db_session.add(b2)
        await test_db_session.commit()

        result = await books.list_books(test_db_session, language="FR")
        assert len(result) == 1
        assert result[0].language == Language.FR


class TestDocumentsService:
    """Tests for documents service."""

    def test_generate_storage_name(self):
        """Test document storage name generation."""
        book_id = uuid.uuid4()
        name = documents.generate_storage_name(book_id, "my-document.pdf")
        assert str(book_id) in name
        assert "pdf" in name.lower()

    def test_generate_storage_name_with_special_chars(self):
        """Test storage name with special characters."""
        book_id = uuid.uuid4()
        name = documents.generate_storage_name(book_id, "my-doc@#$%.pdf")
        assert str(book_id) in name
        # Special characters should be replaced
        assert "@" not in name
        assert "#" not in name

    def test_get_upload_dir_creates_if_missing(self, tmp_path):
        """Test that upload dir is created if missing."""
        with patch.dict("os.environ", {"UPLOAD_DIR": str(tmp_path / "new_upload_dir")}):
            upload_dir = documents.get_upload_dir()
            assert upload_dir.exists()

    @pytest.mark.asyncio
    async def test_search_books_by_query(self, test_db_session):
        """Test searching books by document content."""
        from backend.models.document import Document
        from backend.models.book import Language

        # Create book and document
        book = Book(
            title="Python Guide",
            author="Author",
            category="Programming",
            language=Language.EN,
            description="About Python",
        )
        test_db_session.add(book)
        await test_db_session.flush()

        doc = Document(
            book_id=book.id,
            filename="guide.pdf",
            content_text="This is a comprehensive Python guide with examples",
        )
        test_db_session.add(doc)
        await test_db_session.commit()

        # Search
        result = await documents.search_books_by_query(test_db_session, "Python")
        assert len(result) == 1
        assert result[0].title == "Python Guide"

    @pytest.mark.asyncio
    async def test_search_books_no_results(self, test_db_session):
        """Test search with no matches."""
        result = await documents.search_books_by_query(
            test_db_session, "nonexistent_term"
        )
        assert result == []
