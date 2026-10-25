import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine, get_db
from .models import GroceryItem, ShoppingList
from .schemas import ItemCreate, ItemResponse, ItemUpdate, ShoppingListResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aislevision")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as session:
            if session.get(ShoppingList, "demo") is None:
                session.add(ShoppingList(list_id="demo"))
                session.commit()
        logger.info("Database connected and checklist schema is ready.")
    except Exception:
        logger.exception(
            "Could not initialize MySQL. Confirm the aislevision database exists "
            "and MYSQL_* environment variables are correct."
        )
        raise
    yield


app = FastAPI(title="AisleVision Checklist API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"https://[a-z0-9-]+\.ngrok-free\.app",
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]


@app.get("/health")
def health(db: DatabaseSession) -> dict[str, str | bool]:
    try:
        db.execute(text("SELECT 1"))
    except Exception as error:
        logger.exception("Health check could not reach MySQL.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed",
        ) from error
    return {"ok": True, "database": "connected"}


@app.get("/api/lists/{list_id}/items", response_model=ShoppingListResponse)
def get_list_items(list_id: str, db: DatabaseSession) -> ShoppingListResponse:
    shopping_list = db.get(ShoppingList, list_id)
    if shopping_list is None:
        raise HTTPException(status_code=404, detail="Shopping list not found")

    items = list(
        db.scalars(
            select(GroceryItem)
            .where(GroceryItem.list_id == list_id)
            .order_by(GroceryItem.id)
        )
    )
    return ShoppingListResponse(
        list_id=list_id,
        items=items,
        total=len(items),
        completed=sum(item.checked for item in items),
    )


@app.post(
    "/api/lists/{list_id}/items",
    response_model=ItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_item(
    list_id: str, body: ItemCreate, db: DatabaseSession
) -> GroceryItem:
    if db.get(ShoppingList, list_id) is None:
        raise HTTPException(status_code=404, detail="Shopping list not found")

    item = GroceryItem(list_id=list_id, name=body.name, checked=False)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.patch("/api/items/{item_id}", response_model=ItemResponse)
def update_item(
    item_id: int, body: ItemUpdate, db: DatabaseSession
) -> GroceryItem:
    item = db.get(GroceryItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    item.checked = body.checked
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: DatabaseSession) -> Response:
    item = db.get(GroceryItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
