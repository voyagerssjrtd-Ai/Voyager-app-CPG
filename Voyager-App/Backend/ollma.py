from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_ollama import OllamaLLM
import os

def getOllamaGemma34b(inputquestion):
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system","You are a helpful assistant, Help the user to answer for quries"),
            ("user","Question:{question}")
        ]
    )
    llm = OllamaLLM(model = "gemma3:4b")
    response = llm.invoke(inputquestion)
    return response