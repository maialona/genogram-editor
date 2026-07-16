export function getAiChatboxClassName(isGenerating: boolean) {
  return `ai-chatbox${isGenerating ? " is-generating" : ""}`;
}
