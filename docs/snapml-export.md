# Object Detection: SnapML ONNX Export (YOLOv7)

## Overview
This document describes how we exported a pretrained YOLOv7-tiny object detection model
to ONNX format for use with SnapML in Lens Studio.

## Why
We use a pretrained model to prototype object detection and validate the SnapML pipeline.
If needed, we will later train a custom model to improve accuracy and detect items not included in YOLOv7.

## Steps

**1. Clone Modified YOLOv7**
```bash
cd ~
git clone https://github.com/hartwoolery/yolov7
cd yolov7
```

Update `requirements.txt` for PyTorch version compatibility:
```bash
torch==2.2.2
torchvision==0.17.2
```

Install dependencies:
```bash
pip install -r requirements.txt
```


**2. Download pre-trained weights**
```bash
cd ~/yolov7
wget https://github.com/WongKinYiu/yolov7/releases/download/v0.1/yolov7-tiny.pt
```

**3. Install ONNX dependencies**
```bash
pip install "onnx==1.16.1"
pip install onnx-graphsurgeon
pip install —-user "onnx-simplifier>=0.3.6"
```

**4. Export to ONNX (SnapML compatible)**
Run the command:
```bash
python export.py \
  --weights yolov7-tiny.pt \                          # Path to trained weights
  --grid \                                            # Export detection grid
  --simplify \                                        # Simplify ONNX graph
  --export-snapml \                                   # Special flag for SnapML compatibility
  --img-size 224 224 \                                # Input dimensions (use your IMG_SIZE)
  --max-wh 224
```

## Output
```bash
yolov7-tiny.onnx
```

## Notes
- No training required for this step
- The model uses COCO pretrained classes
- Non-Maximum Suppression (NMS) is handled in Lens Studio

## Reference
[SnapML on Spectacles](https://developers.snap.com/spectacles/about-spectacles-features/snapML)
[YOLOv7 SnapML Fork](https://github.com/hartwoolery/yolov7)
