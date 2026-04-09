import os
import shutil
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
from database import engine, get_db

# Create all tables in the database (this will create learning_modules.db)
models.Base.metadata.create_all(bind=engine)

# Ensure uploads directory exists securely
os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="Learning Module Maker API",
    description="API for creating and managing educational modules.",
    version="0.1.0"
)

# Mount directories
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    """
    Secure file upload endpoint.
    Saves file to /uploads/ and generates a unique filename to prevent collisions.
    """
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    safe_filename = f"{uuid4()}{file_ext}"
    file_location = os.path.join("uploads", safe_filename)
    
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    return {"url": f"/uploads/{safe_filename}", "filename": file.filename}

@app.post("/modules/", response_model=schemas.ModuleResponse, status_code=201)
def create_module(module: schemas.ModuleCreate, db: Session = Depends(get_db)):
    """
    Create a new learning module.
    """
    db_module = models.DBModule(
        title=module.title,
        description=module.description,
        # Convert Pydantic block list to standard dicts so SQLite can store it as JSON
        blocks=[block.model_dump() for block in module.blocks]
    )
    db.add(db_module)
    db.commit()
    db.refresh(db_module)
    return db_module

@app.get("/modules/", response_model=List[schemas.ModuleResponse])
def list_modules(db: Session = Depends(get_db)):
    """
    Retrieve all available modules.
    """
    return db.query(models.DBModule).all()

@app.get("/modules/{module_id}", response_model=schemas.ModuleResponse)
def get_module(module_id: str, db: Session = Depends(get_db)):
    """
    Retrieve a specific module by its ID.
    """
    db_module = db.query(models.DBModule).filter(models.DBModule.id == module_id).first()
    if not db_module:
        raise HTTPException(status_code=404, detail="Module not found")
    return db_module

@app.delete("/modules/{module_id}")
def delete_module(module_id: str, db: Session = Depends(get_db)):
    """
    Delete a specific module by its ID.
    """
    db_module = db.query(models.DBModule).filter(models.DBModule.id == module_id).first()
    if not db_module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    db.delete(db_module)
    db.commit()
    return {"message": "Module deleted successfully"}
