from openai import OpenAI
print("heo")
client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="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",
)

completion = client.chat.completions.create(
  model="openai/gpt-oss-120b:free",
  messages=[
    {
      "role": "user",
      "content": "What is the meaning of life?"
    }
  ]
)
print(completion.choices[0].message.content)