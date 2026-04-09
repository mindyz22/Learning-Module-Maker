from sqlalchemy import Column, String, JSON
import uuid

from database import Base

class DBModule(Base):
    __tablename__ = "modules"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, index=True)
    description = Column(String, default="")
    
    # Store the complex list of blocks as a flexible JSON object
    blocks = Column(JSON, default=list)
