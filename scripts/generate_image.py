import vertexai
from vertexai.preview.vision_models import ImageGenerationModel
import base64
import json
import sys
import os
import tempfile
from google.oauth2 import service_account


def generate_image(prompt):
    temp_dir = tempfile.gettempdir()
    output_file = os.path.join(temp_dir, f"image_output_{os.getpid()}.json")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    service_account_path = os.path.join(script_dir, "..", "service_account.json")

    try:
        credentials = service_account.Credentials.from_service_account_file(service_account_path)
        vertexai.init(project="etm-cloud", location="asia-south1", credentials=credentials)
        model = ImageGenerationModel.from_pretrained("imagen-3.0-generate-002")
        response = model.generate_images(
            prompt=prompt,
            number_of_images=1,
            language="en",
            aspect_ratio="1:1"
        )
        
        if not response.images or len(response.images) == 0:
            raise Exception("No images were generated in the response")
            
        image = response.images[0]
        image_base64 = base64.b64encode(image._image_bytes).decode('utf-8')
        with open(output_file, 'w') as f:
            json.dump({
                "success": True,
                "image_data": image_base64
            }, f)
        return output_file
    except Exception as e:
        with open(output_file, 'w') as f:
            json.dump({
                "success": False,
                "error": str(e)
            }, f)
        return output_file

if __name__ == "__main__":
    prompt = sys.argv[1]
    output_file = generate_image(prompt)
    print(output_file, end='', file=sys.stdout) 