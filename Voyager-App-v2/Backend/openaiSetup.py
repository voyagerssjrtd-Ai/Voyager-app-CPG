import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")
llm = ChatOpenAI()
response  = llm.invoke("hi")
print(response.content)

# def getOpenAI(userInput):
#     response = llm.invoke(userInput)
#     return response.context
