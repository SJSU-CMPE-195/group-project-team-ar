import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger"
import {DetectionContainer} from "./DetectionContainer"
import {Detection} from "./DetectionHelpers"
import {MLSpatializer} from "./MLSpatializer"
import {PinholeCapture} from "./PinholeCapture"

// Create a logger instance for this class
const log = new NativeLogger("BoundingBoxVisualizer")

// Relative change in box size before the polyline is rebuilt
const SIZE_TOLERANCE = 0.02

/**
 * Draws a bounding box around each detection from MLSpatializer, updated every frame.
 * Box corners are projected from the 2D bbox at a fixed depth, so the box covers the
 * object's angular extent from the viewer's point of view.
 */
@component
export class BoundingBoxVisualizer extends BaseScriptComponent {
  @input
  @hint("MLSpatializer that emits detection updates")
  mlSpatializer: MLSpatializer

  @input
  @hint("PinholeCapture used to project detections into world space")
  pinholeCapture: PinholeCapture

  @input
  @hint("Screen Crop Texture fed to the ML model, used to map detections back to the full camera frame")
  cropTexture: Texture

  @input
  @hint("Prefab with a DetectionContainer and ClosedPolyline (e.g. DetectionPrefab)")
  boxPrefab: ObjectPrefab

  @input
  @hint("Maximum number of boxes to show at once")
  @widget(new SliderWidget(1, 20, 1))
  maxBoxes: number = 5

  @input
  @hint("Distance from the camera (cm) at which boxes are drawn")
  boxDepth: number = 150

  @input
  @hint("Time in seconds to keep a box after its detection disappears")
  @widget(new SliderWidget(0, 2, 0.05))
  persistence: number = 0.3

  @input("vec2", "{1, 1}")
  @hint("Scale applied to camera UVs before projection (fine calibration)")
  uvScale: vec2 = new vec2(1, 1)

  @input("vec2", "{0, 0}")
  @hint("Offset applied to camera UVs before projection (fine calibration)")
  uvOffset: vec2 = new vec2(0, 0)

  @input
  @hint("Log box placement to console")
  debugLogging: boolean = false

  private boxes: SceneObject[] = []
  private containers: DetectionContainer[] = []
  private boxSizes: vec2[] = []
  private lastSeen: number[] = []
  private cropRect: Rect = Rect.create(-1, 1, -1, 1)
  private isReady: boolean = false

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.onStart())
    this.createEvent("UpdateEvent").bind(() => this.hideStaleBoxes())
  }

  private onStart(): void {
    if (!this.mlSpatializer || !this.pinholeCapture || !this.boxPrefab) {
      log.e("mlSpatializer, pinholeCapture and boxPrefab inputs must all be set")
      return
    }

    if (this.cropTexture) {
      this.cropRect = (this.cropTexture.control as RectCropTextureProvider).cropRect
    } else {
      log.w("cropTexture not set - assuming the model sees the full camera frame")
    }

    this.initBoxes()

    this.pinholeCapture.getInitPromise().then((success) => {
      if (!success) {
        log.e("PinholeCapture failed to initialize")
        return
      }

      this.mlSpatializer.getDetectionsUpdatedEvent().add((detections: Detection[]) => this.onDetections(detections))
      this.isReady = true
    })
  }

  /**
   * Create a pool of disabled box instances
   */
  private initBoxes(): void {
    const boxesParent = global.scene.createSceneObject("BoundingBoxes")
    boxesParent.setParent(this.getSceneObject())

    for (let i = 0; i < this.maxBoxes; i++) {
      const box = this.boxPrefab.instantiate(boxesParent)
      box.name = "BoundingBox_" + i
      box.enabled = false

      const container = box.getComponent(DetectionContainer.getTypeName()) as DetectionContainer
      if (!container || !container.polyline || !container.polylinePoints || container.polylinePoints.length < 4) {
        log.e("boxPrefab needs a DetectionContainer with a polyline and 4 polylinePoints")
        box.destroy()
        return
      }

      // Depth is fixed, so a distance readout would be misleading
      if (container.distanceFromCamera) {
        container.distanceFromCamera.enabled = false
      }

      this.boxes.push(box)
      this.containers.push(container)
      this.boxSizes.push(vec2.zero())
      this.lastSeen.push(0)
    }
  }

  /**
   * Place one box per detection, in score order
   */
  private onDetections(detections: Detection[]): void {
    if (!this.isReady || detections.length === 0) {
      return
    }

    if (!this.pinholeCapture.saveMatrix()) {
      return
    }

    const cameraPos = this.pinholeCapture.worldSpaceOfTrackingCamera()
    const now = getTime()
    const count = Math.min(detections.length, this.boxes.length)

    for (let i = 0; i < count; i++) {
      this.placeBox(i, detections[i], cameraPos)
      this.lastSeen[i] = now
    }
  }

  private placeBox(index: number, detection: Detection, cameraPos: vec3): void {
    const box = this.boxes[index]
    const container = this.containers[index]

    // bbox format: [centerX, centerY, width, height] (normalized 0-1)
    const centerX = detection.bbox[0]
    const centerY = detection.bbox[1]
    const halfW = detection.bbox[2] / 2
    const halfH = detection.bbox[3] / 2

    const center = this.project(centerX, centerY)
    const cornerA = this.project(centerX - halfW, centerY - halfH)
    const cornerB = this.project(centerX + halfW, centerY - halfH)
    const cornerC = this.project(centerX - halfW, centerY + halfH)

    // Orient the box to face the camera, with its vertical axis along the bbox height
    const transform = box.getTransform()
    transform.setWorldPosition(center)
    transform.setWorldRotation(quat.lookAt(cameraPos.sub(center).normalize(), cornerC.sub(cornerA).normalize()))

    // Only rebuild the polyline when the box size changes noticeably
    const size = new vec2(cornerA.distance(cornerB) / 2, cornerA.distance(cornerC) / 2)
    if (this.sizeChanged(this.boxSizes[index], size)) {
      const points = container.polylinePoints
      points[0].getTransform().setLocalPosition(new vec3(-size.x, size.y, 0))
      points[1].getTransform().setLocalPosition(new vec3(size.x, size.y, 0))
      points[2].getTransform().setLocalPosition(new vec3(size.x, -size.y, 0))
      points[3].getTransform().setLocalPosition(new vec3(-size.x, -size.y, 0))
      container.polyline.refreshLine()
      this.boxSizes[index] = size
    }

    if (container.categoryAndConfidence) {
      container.categoryAndConfidence.text = `${detection.label}: ${Math.round(detection.score * 100)}%`
    }

    box.enabled = true

    if (this.debugLogging) {
      print(
        `[BoundingBoxVisualizer] Box ${index}: ${detection.label} size ${(size.x * 2).toFixed(1)}x${(
          size.y * 2
        ).toFixed(1)}cm`
      )
    }
  }

  /**
   * Project a detection UV into world space at boxDepth
   * Detection UVs are relative to the cropped model input with v pointing down;
   * PinholeCapture expects full camera frame UVs with v pointing up
   */
  private project(u: number, v: number): vec3 {
    // Crop rect is in [-1, 1] local space with y pointing up
    const x = this.cropRect.left + u * (this.cropRect.right - this.cropRect.left)
    const y = this.cropRect.top - v * (this.cropRect.top - this.cropRect.bottom)

    const uv = new vec2(
      Math.max(0, Math.min(1, ((x + 1) / 2) * this.uvScale.x + this.uvOffset.x)),
      Math.max(0, Math.min(1, ((y + 1) / 2) * this.uvScale.y + this.uvOffset.y))
    )
    return this.pinholeCapture.captureToWorldTransform(uv, this.boxDepth)
  }

  private sizeChanged(previous: vec2, current: vec2): boolean {
    return (
      Math.abs(current.x - previous.x) > previous.x * SIZE_TOLERANCE ||
      Math.abs(current.y - previous.y) > previous.y * SIZE_TOLERANCE
    )
  }

  /**
   * Hide boxes whose detection has not been seen within the persistence window
   */
  private hideStaleBoxes(): void {
    const now = getTime()
    for (let i = 0; i < this.boxes.length; i++) {
      if (this.boxes[i].enabled && now - this.lastSeen[i] > this.persistence) {
        this.boxes[i].enabled = false
      }
    }
  }
}
