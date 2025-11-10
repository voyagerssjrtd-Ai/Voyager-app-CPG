from fastapi import FastAPI, Depends, HTTPException
import services,models,schemas
from db import getDB, engine
from sqlalchemy.orm import Session

app = FastAPI()

@app.post("/books/", response_model=schemas.Book)
def createNewBook(book : schemas.BookCreate, db : Session = Depends(getDB)):
    return services.create_book(db,book)

@app.get("/books/", response_model=list[schemas.Book])
def getAllBooks(db : Session = Depends(getDB)):
    return services.get_Books(db)

@app.get("/books/{id}", response_model=schemas.Book)
def getBookById(id : int, db : Session = Depends(getDB)):
    bookQuery = services.get_Book_By_Id(db,id)
    if bookQuery :
        return bookQuery
    raise HTTPException(status_code=404, detail="Invalid book id Provider")

@app.put("/books/{id}", response_model=schemas.Book)
def updateBook(book : schemas.BookCreate, id : int, db : Session = Depends(getDB)):
    dbUpdate = services.update_book(db,book,id)
    if not dbUpdate :
        raise HTTPException(status_code=404, detail="Boot Not found")
    return dbUpdate

@app.delete("/books/{id}", response_model=schemas.Book)
def deleteBook( id : int, db : Session = Depends(getDB)):
    dbDeete = services.update_book(db,book,id)
    if not dbDeete :
        raise HTTPException(status_code=404, detail="Boot Not found")
    return dbDeete
