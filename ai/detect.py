# Placeholder for future Detectron2 roof detection.


def detect_roof(image_path: str):
    return {
        "image_path": image_path,
        "roof_polygons": [],
        "damage_points": [],
    }


if __name__ == "__main__":
    result = detect_roof("test.jpg")
    print(result)
