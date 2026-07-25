export {}

declare global {
  interface NativeBridgeApi {
    getBridgeVersion(): string
    getItems(): string
    addItem(
      name: string,
      quantity: string,
      storage: string,
      expiryDate: string,
    ): string
    getMqttStatus(): string
    ready(): void
  }

  interface Window {
    NativeBridge?: NativeBridgeApi
    onNativeEvent?: (event: unknown) => void
    handleAndroidBack?: () => boolean
  }
}
