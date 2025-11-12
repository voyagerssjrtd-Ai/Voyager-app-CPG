from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "postgresql://postgres:123456@localhost:5432/TestDB"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
Sessionlocal = sessionmaker(autocommit = False, autoflush=False, bind=engine)
Base = declarative_base()

def getDB():
    db = Sessionlocal()
    try:
        yield db
    finally :
        db.close

def createTable():
    Base.metadata.create_all(bind = engine)

'''
CREATE TABLE "Books" (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    description TEXT,
    author VARCHAR(100),
    year INTEGER
);
'''
