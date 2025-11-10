from fastapi import FastAPI, File, UploadFile
from typing import List
from ollma import getOllamaGemma34b


app = FastAPI()

@app.get("/")
def greet(): 
    return "Hello world"

@app.post("/saveFiles")
async def uploadDocuments(file: UploadFile = File(...)):
    file_ext = file.filename.split(".")[-1].lower()
    temp_path = f"temp_{file.filename.replace(' ', '_')}"
    with open(f'savedFiles/{file.filename}', "wb") as f:
        f.write(file.file.read())
    return "Successully Saved the file"

@app.post("/saveMultipleFiles")
async def uploadDocuments(files: List[UploadFile] = File(...)):
    for file in files :
        with open(f'savedFiles/{file.filename}', "wb") as f:
            f.write(file.file.read())
    return "Successully Saved all files"

@app.get("/userInput/{inputQuestion}")
def userInputQuestion(inputQuestion):
    return getOllamaGemma34b(inputQuestion)


   
    #     if file_ext == "pdf":
    #         content = extract_pdf(temp_path)
    #     elif file_ext == "csv":
    #         content = extract_csv(temp_path)
    #     elif file_ext == "txt":
    #         content = extract_txt(temp_path)
    #     elif file_ext == "ods":
    #         content = extract_ods(temp_path)
    #     elif file_ext in ["jpg", "jpeg"]:
    #         content = extract_image_text(temp_path)
    #     else:
    #         return {"error": "Unsupported file type"}
    # finally:
    #     os.remove(temp_path)

    # return {"filename": file.filename, "content": content}


