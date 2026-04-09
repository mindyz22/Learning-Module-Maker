from __future__ import annotations
from typing import Annotated, Literal, Union
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Individual block types
# ---------------------------------------------------------------------------

class TextBlock(BaseModel):
    type: Literal["text"]
    content: str = Field(
        description="The body text. Supports plain text or markdown."
    )


class ImageBlock(BaseModel):
    type: Literal["image"]
    url: str = Field(
        description="URL or local file path to the image."
    )
    alt_text: str = Field(
        default="",
        description="Describes the image for accessibility and screen readers."
    )
    caption: str = Field(
        default="",
        description="Optional caption displayed below the image."
    )


class VideoBlock(BaseModel):
    type: Literal["video"]
    url: str = Field(
        description="URL to the video (e.g. YouTube link or uploaded file path)."
    )
    caption: str = Field(
        default="",
        description="Optional caption displayed below the video."
    )


class Choice(BaseModel):
    text: str = Field(
        description="The answer option shown to the learner."
    )
    explanation: str = Field(
        default="",
        description="Feedback shown after the learner submits. Explain why this choice is right or wrong."
    )


class QuizBlock(BaseModel):
    type: Literal["quiz"]
    question: str = Field(
        description="The question shown to the learner."
    )
    choices: list[Choice] = Field(
        min_length=2,
        max_length=6,
        description="The answer options. Must have between 2 and 6 choices."
    )
    correct_index: int = Field(
        ge=0,
        description="Index of the correct answer in the choices list (0-based)."
    )


# ---------------------------------------------------------------------------
# Union type — represents any valid block
# ---------------------------------------------------------------------------

Block = Annotated[
    Union[TextBlock, ImageBlock, VideoBlock, QuizBlock],
    Field(discriminator="type")
]


# ---------------------------------------------------------------------------
# Top-level Module models
# ---------------------------------------------------------------------------

class ModuleBase(BaseModel):
    title: str = Field(
        description="The display name of the module."
    )
    description: str = Field(
        default="",
        description="A short summary of what the module covers."
    )
    blocks: list[Block] = Field(
        default_factory=list,
        description="Ordered list of content blocks that make up the module."
    )

class ModuleCreate(ModuleBase):
    pass

class ModuleResponse(ModuleBase):
    id: str = Field(
        description="The unique database ID of the module."
    )

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Example usage / quick test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    sample = ModuleCreate(
        title="Intro to Python",
        description="A beginner-friendly introduction to Python basics.",
        blocks=[
            TextBlock(
                type="text",
                content="Welcome! In this module you'll learn the fundamentals of Python."
            ),
            ImageBlock(
                type="image",
                url="/static/uploads/python-logo.png",
                alt_text="The Python programming language logo",
                caption="Python — one of the most popular languages in the world."
            ),
            VideoBlock(
                type="video",
                url="https://www.youtube.com/watch?v=example",
                caption="Watch this 5-minute overview before continuing."
            ),
            QuizBlock(
                type="quiz",
                question="Which symbol is used for comments in Python?",
                choices=[
                    Choice(text="//", explanation="This is used in languages like JavaScript and Java, not Python."),
                    Choice(text="#", explanation="Correct! Anything after a # on a line is treated as a comment."),
                    Choice(text="/*", explanation="This opens a multi-line comment block in C and Java, not Python."),
                    Choice(text="--", explanation="This is used for comments in SQL, not Python."),
                ],
                correct_index=1
            ),
        ]
    )

    print(sample.model_dump_json(indent=2))