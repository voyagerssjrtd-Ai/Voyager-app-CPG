from models import Book
from sqlalchemy.orm import Session
from schemas import BookCreate

def create_book(db : Session, data: BookCreate):
    book_instance = Book(**data.model_dump())
    db.add(book_instance)
    db.commit()
    db.refresh(book_instance)
    return book_instance

def get_Books(db : Session):
    return db.query(Book).all()

def get_Book_By_Id(db : Session, book_id:int):
    return db.query(Book).filter(Book.id==book_id).first()

def update_book(db : Session, book : BookCreate, book_id : int):
    bookQuery = db.query(Book).filter(Book.id==book_id).first()
    if bookQuery :
        for key,val in book.model_dump().items():
            setattr(bookQuery,key,val)
        db.commit()
        db.refresh(bookQuery)
    return bookQuery

def delete_book(db : Session, id : int):
    bookQuery = db.query(Book).filter(Book.id==id).first()
    if bookQuery :
        db.delete(bookQuery)
        db.commit()
    return bookQuery



