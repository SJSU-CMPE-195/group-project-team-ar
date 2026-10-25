from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class ShoppingList(Base):
    __tablename__ = "shopping_lists"

    list_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    items: Mapped[list["GroceryItem"]] = relationship(
        back_populates="shopping_list",
        cascade="all, delete-orphan",
        order_by="GroceryItem.id",
    )


class GroceryItem(Base):
    __tablename__ = "shopping_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    list_id: Mapped[str] = mapped_column(
        ForeignKey("shopping_lists.list_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    checked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    shopping_list: Mapped[ShoppingList] = relationship(back_populates="items")
