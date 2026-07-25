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
      addedDate?: string,
    ): string
    removeItem?(id: string): string
    updateItemQuantity?(id: string, quantity: string): string
    getMqttStatus(): string
    getImageProviderSummary(): string
    saveImageProviderConfig(
      providerName: string,
      endpoint: string,
      apiKey: string,
    ): string
    removeImageProviderConfig(): string
    getCredentialSummaries?(): string
    saveCredentialConfig?(
      capability: string,
      providerId: string,
      providerLabel: string,
      modelId: string,
      endpoint: string,
      apiKey: string,
    ): string
    removeCredentialConfig?(capability: string): string
    startAssistantRequest?(requestJson: string): string
    getAssistantRequest?(jobId: string): string
    startRecipeIllustration(requestJson: string): string
    getRecipeIllustrationJob(jobId: string): string
    removeRecipeIllustrationJob(jobId: string): string
    askAssistant?(requestId: string, requestJson: string): string
    startSpeechRecognition?(requestId: string): string
    stopSpeechRecognition?(requestId: string): string
    setDisplayState?(displayJson: string): string
    ready(): void
  }

  interface Window {
    NativeBridge?: NativeBridgeApi
    onNativeEvent?: (event: unknown) => void
    handleAndroidBack?: () => boolean
  }
}
