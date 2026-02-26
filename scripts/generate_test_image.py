import os
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY") or os.environ["GEMINI_API_KEY"])

STYLE_PROMPT = (
    "A beautiful, high-quality photograph of a {subject}. "
    "The image should be photorealistic with vivid natural colors, soft studio-like lighting, "
    "and a clean, slightly blurred pastel background. The subject should be centered and clearly visible, "
    "captured as if by a professional wildlife/product photographer. "
    "Sharp focus on the subject, shallow depth of field. "
    "No text, no labels, no watermarks. Square 1:1 composition."
)

subject = "lion standing majestically, full body visible"
prompt = STYLE_PROMPT.format(subject=subject)

print(f"Generating image for: {subject}")
print(f"Prompt: {prompt}")

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[prompt],
    config=types.GenerateContentConfig(
        response_modalities=["Text", "Image"],
        image_config=types.ImageConfig(
            aspect_ratio="1:1",
            image_size="1K",
        ),
    ),
)

output_dir = os.path.join(os.path.dirname(__file__), "..", "public", "test")
os.makedirs(output_dir, exist_ok=True)

for part in response.candidates[0].content.parts:
    if part.text is not None:
        print(f"Model text: {part.text}")
    elif part.inline_data is not None:
        image = Image.open(BytesIO(part.inline_data.data))
        output_path = os.path.join(output_dir, "lion_realistic.png")
        image.save(output_path)
        print(f"Saved: {output_path} ({image.size[0]}x{image.size[1]})")
