import os
from langchain_community.document_loaders import PyMuPDFLoader, DirectoryLoader
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chat_models import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.schema.runnable import RunnableMap
from langchain.schema.output_parser import StrOutputParser

# 🔐 Set your OpenAI API key
os.environ["OPENAI_API_KEY"] = "your-api-key-here"

# 📄 Load PDF documents
def load_documents(pdf_path: str):
    loader = DirectoryLoader(
        pdf_path,
        glob="**/*.pdf",
        loader_cls=PyMuPDFLoader,
        show_progress=True
    )
    return loader.load()

# 🧠 Semantic chunking
def chunk_documents(docs):
    text_splitter = SemanticChunker(OpenAIEmbeddings(), breakpoint_threshold_type="percentile")
    return text_splitter.create_documents([doc.page_content for doc in docs])

# 🗃️ Store in Chroma vector DB
def store_in_chroma(documents, persist_dir="./chroma_db"):
    vector_db = Chroma.from_documents(documents, OpenAIEmbeddings(), persist_directory=persist_dir)
    vector_db.persist()
    return vector_db.as_retriever()

# 🤖 Create LLM
def create_llm():
    return ChatOpenAI(model_name="gpt-3.5-turbo")

# 🧠 Create RAG chain
def create_rag_chain(retriever, llm):
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template="""
You are a helpful assistant answering questions based on the following context.

Context:
{context}

Question:
{question}

Answer in clear, concise language and cite specific points from the context when relevant.
"""
    )

    rag_chain = RunnableMap({
        "context": lambda x: format_docs(retriever.get_relevant_documents(x["question"])),
        "question": lambda x: x["question"]
    }) | prompt | llm | StrOutputParser()

    return rag_chain

# 🚀 Run the pipeline
if __name__ == "__main__":
    pdf_path = "C:/path/to/your/pdfs"  # Update this path
    raw_docs = load_documents(pdf_path)
    chunked_docs = chunk_documents(raw_docs)
    retriever = store_in_chroma(chunked_docs)
    llm = create_llm()
    rag_chain = create_rag_chain(retriever, llm)

    # ❓ Ask a question
    query = "What are the key findings in the document?"
    response = rag_chain.invoke({"question": query})
    print("\nAnswer:\n", response)