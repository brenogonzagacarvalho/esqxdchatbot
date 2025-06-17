from transformers import pipeline
import sys, json

# carrega o pipeline text2text
pipe = pipeline("text2text-generation", model="google/flan-t5-small")

# lê do stdin JSON {"question": "...", "context": "..."}
data = json.load(sys.stdin)
inp = f"question: {data['question']}\ncontext:\n{data['context']}"

res = pipe(inp, max_new_tokens=150, do_sample=False)
print(res[0]['generated_text'])