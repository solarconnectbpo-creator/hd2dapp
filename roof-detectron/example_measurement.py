"""Example: polygons → pixel total → sq ft (after you set scale from GSD / calibration)."""

from inference import detect_roof, setup_predictor
from utils import roof_measurement_summary


def main() -> None:
    setup_predictor()
    # Replace with your ortho / drone image path
    image_path = "test.jpg"
    polygons = detect_roof(image_path)

    # Example only: real reports need calibrated ft² per px² from camera or map.
    example_sqft_per_px_sq = 0.0  # set > 0 when calibrated
    summary = roof_measurement_summary(
        polygons,
        sqft_per_px_sq=example_sqft_per_px_sq or None,
    )
    print(summary)


if __name__ == "__main__":
    main()
