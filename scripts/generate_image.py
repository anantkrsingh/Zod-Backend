import vertexai
from vertexai.preview.vision_models import ImageGenerationModel
import base64
import json
import sys
import os
import tempfile

def generate_image(prompt):
    vertexai.init(project="etm-cloud", location="asia-south1")
    
    model = ImageGenerationModel.from_pretrained("imagen-3.0-generate-002")
    response = model.generate_images(
        prompt=prompt,
        number_of_images=1,
        language="en"
    )

    
    image = response.images[0]
    
    image_base64 = base64.b64encode(image._image_bytes).decode('utf-8')
    
    temp_dir = tempfile.gettempdir()
    output_file = os.path.join(temp_dir, f"image_output_{os.getpid()}.json")
    
    with open(output_file, 'w') as f:
        json.dump({
            "success": True,
            "image_data": image_base64
        }, f)
    
    return output_file

if __name__ == "__main__":
    prompt = sys.argv[1]
    output_file = generate_image(prompt)
    print(output_file, file=sys.stdout) 