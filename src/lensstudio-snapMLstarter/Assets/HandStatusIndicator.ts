import {SIK} from "SpectaclesInteractionKit.lspkg/SIK"
import {HandType} from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandType"

const HANDS: HandType[] = ["left", "right"]

@component
export class HandStatusIndicator extends BaseScriptComponent {
  @input
  @hint("Text component that shows which hands are tracked and pinching")
  statusText: Text

  private tracked = {left: false, right: false}
  private pinching = {left: false, right: false}

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => {
      HANDS.forEach((type) => {
        const hand = SIK.HandInputData.getHand(type)
        hand.onHandFound.add(() => this.setTracked(type, true))
        hand.onHandLost.add(() => {
          this.pinching[type] = false
          this.setTracked(type, false)
        })
        hand.onPinchDown.add(() => this.setPinching(type, true))
        hand.onPinchUp.add(() => this.setPinching(type, false))
        hand.onPinchCancel.add(() => this.setPinching(type, false))
      })
      this.refresh()
    })
  }

  private setTracked(type: HandType, value: boolean): void {
    this.tracked[type] = value
    print(`[HandStatusIndicator] ${type} hand ${value ? "detected" : "lost"}`)
    this.refresh()
  }

  private setPinching(type: HandType, value: boolean): void {
    this.pinching[type] = value
    print(`[HandStatusIndicator] ${type} hand ${value ? "pinch" : "release"}`)
    this.refresh()
  }

  private describe(type: HandType): string {
    const label = type === "left" ? "Left" : "Right"
    if (!this.tracked[type]) {
      return `${label}: not detected`
    }
    return `${label}: ${this.pinching[type] ? "PINCH" : "detected"}`
  }

  private refresh(): void {
    if (!this.statusText) {
      return
    }
    this.statusText.text = `${this.describe("left")}\n${this.describe("right")}`
  }
}
