import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"

const UNCHECKED_COLOR = new vec4(0.85, 0.15, 0.15, 0.5)
const CHECKED_COLOR = new vec4(0.15, 0.65, 0.25, 0.5)
const STRIKE_COLOR = new vec4(1, 1, 1, 1)
const MARGIN_X = 1.5
const MARGIN_Y = 0.5
const CORNER_RADIUS = 0.5
const STRIKE_CHARS_PER_LETTER = 0.6

@component
export class PinchRow extends BaseScriptComponent {
  @input
  @hint("Text component that shows the item name")
  labelText: Text

  @input
  @hint("Item name shown until a real item is assigned")
  itemName: string = "Item"

  checked: boolean = false
  aisle: string = ""
  itemId: number = -1
  onToggle: (row: PinchRow) => void = null

  private strikeText: Text = null
  private collider: ColliderComponent = null
  private colliderDirty: boolean = true

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => {
      const interactable = this.getSceneObject().getComponent(Interactable.getTypeName())
      if (!interactable) {
        print("[PinchRow] missing Interactable on " + this.getSceneObject().name)
        return
      }
      interactable.onTriggerEnd.add(() => this.handlePinch())

      this.collider = this.getSceneObject().getComponent("Physics.ColliderComponent")
      this.createStrike()
      this.styleBackground()
      this.refresh()
    })
    // The text layout is only known a frame after the text changes, so size the collider then
    this.createEvent("UpdateEvent").bind(() => this.updateCollider())
  }

  setItem(id: number, name: string, checked: boolean, aisle: string = ""): void {
    this.itemId = id
    this.itemName = name
    this.checked = checked
    this.aisle = aisle
    this.refresh()
  }

  setChecked(checked: boolean): void {
    this.checked = checked
    this.refresh()
  }

  private handlePinch(): void {
    print(`[PinchRow] pinched ${this.itemName}`)
    this.checked = !this.checked
    this.refresh()
    if (this.onToggle) {
      this.onToggle(this)
    }
  }

  private createStrike(): void {
    if (!this.labelText) {
      return
    }
    const strikeObject = global.scene.createSceneObject("Strike")
    strikeObject.setParent(this.getSceneObject())
    this.strikeText = strikeObject.createComponent("Component.Text")
    this.strikeText.size = this.labelText.size
    this.strikeText.textFill.color = STRIKE_COLOR
    this.strikeText.renderOrder = this.labelText.renderOrder + 1
    this.strikeText.depthTest = this.labelText.depthTest
  }

  private styleBackground(): void {
    if (!this.labelText) {
      return
    }
    const background = this.labelText.backgroundSettings
    background.enabled = true
    background.cornerRadius = CORNER_RADIUS
    background.margins = Rect.create(MARGIN_X, MARGIN_X, MARGIN_Y, MARGIN_Y)
  }

  private displayText(): string {
    return this.aisle ? `${this.itemName}  ·  Aisle ${this.aisle}` : this.itemName
  }

  private refresh(): void {
    const display = this.displayText()
    if (this.labelText) {
      this.labelText.text = display
      this.labelText.backgroundSettings.fill.color = this.checked ? CHECKED_COLOR : UNCHECKED_COLOR
    }
    if (this.strikeText) {
      const count = Math.max(2, Math.ceil(display.length * STRIKE_CHARS_PER_LETTER))
      this.strikeText.text = "—".repeat(count)
      this.strikeText.enabled = this.checked
    }
    this.colliderDirty = true
  }

  // Makes the whole colored box pinchable, not just the text glyphs
  private updateCollider(): void {
    if (!this.colliderDirty || !this.collider || !this.labelText) {
      return
    }
    this.colliderDirty = false
    const rect = this.labelText.worldSpaceRect
    const width = rect.right - rect.left + MARGIN_X * 2
    const height = rect.top - rect.bottom + MARGIN_Y * 2
    const shape = Shape.createBoxShape()
    shape.size = new vec3(width, height, 2)
    this.collider.fitVisual = false
    this.collider.shape = shape
  }
}
