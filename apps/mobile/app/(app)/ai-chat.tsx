/**
 * KI-Chat — AI Chat Screen
 *
 * Chat interface with SSE streaming from POST /api/ai/chat.
 * Suggested prompts, keyboard avoiding, German text.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { Card } from "@/components/nativewindui/Card";
import { Text } from "@/components/nativewindui/Text";
import { useColorScheme } from "@/lib/useColorScheme";
import { getSession } from "@/lib/session-store";
import { getOrgId } from "@/lib/org-store";

const BASE_URL = process.env.EXPO_PUBLIC_APP_URL || "http://localhost:3003";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Suggested Prompts
// ---------------------------------------------------------------------------

const SUGGESTED_PROMPTS = [
  "Wie viel Zement haben wir?",
  "Welche Werkzeuge sind ueberfaellig?",
  "Zeige niedrige Bestaende",
  "Welche Kommissionen sind offen?",
  "Zusammenfassung der heutigen Buchungen",
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function AiChatScreen() {
  const { colors } = useColorScheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // ── Send Message ────────────────────────────────────────────────────

  async function sendMessage(text?: string) {
    const content = (text || input).trim();
    if (!content || isStreaming) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };

    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
    };

    const updatedMessages = [...messages, userMsg];
    setMessages([...updatedMessages, assistantMsg]);
    setIsStreaming(true);
    scrollToBottom();

    try {
      const session = getSession();
      const orgId = getOrgId();

      const controller = new AbortController();
      abortRef.current = controller;

      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.token
            ? { Authorization: `Bearer ${session.token}` }
            : {}),
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(
          (await res.text().catch(() => "")) || "Fehler bei der KI-Anfrage"
        );
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("Stream nicht verfuegbar");
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta =
                parsed.choices?.[0]?.delta?.content ||
                parsed.content ||
                parsed.text ||
                "";
              if (delta) {
                accumulated += delta;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: accumulated,
                    };
                  }
                  return updated;
                });
                scrollToBottom();
              }
            } catch {
              // If not JSON, treat as plain text chunk
              if (data && data !== "[DONE]") {
                accumulated += data;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: accumulated,
                    };
                  }
                  return updated;
                });
                scrollToBottom();
              }
            }
          }
        }
      }

      // Ensure final content is set
      if (accumulated) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: accumulated };
          }
          return updated;
        });
      } else {
        // No content streamed — show a fallback
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant" && !last.content) {
            updated[updated.length - 1] = {
              ...last,
              content: "Entschuldigung, ich konnte keine Antwort generieren.",
            };
          }
          return updated;
        });
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: `Fehler: ${e.message || "Unbekannter Fehler"}`,
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      scrollToBottom();
    }
  }

  // ── Render ──────────────────────────────────────────────────────────

  const isEmpty = messages.length === 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: "KI-Assistent",
          headerBackTitle: "Zurueck",
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={[]} className="bg-background">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          {/* Messages or Empty State */}
          {isEmpty ? (
            <View className="flex-1 justify-center items-center px-6 gap-6">
              <View className="items-center gap-3">
                <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center">
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={32}
                    color={colors.primary}
                  />
                </View>
                <Text variant="heading" className="font-bold text-center">
                  KI-Assistent
                </Text>
                <Text className="text-muted-foreground text-center text-sm">
                  Frage mich zu Bestaenden, Werkzeugen, Kommissionen und mehr.
                </Text>
              </View>

              <View className="w-full gap-2">
                <Text className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Vorschlaege
                </Text>
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    className="border border-border rounded-xl px-4 py-3 bg-card"
                    onPress={() => sendMessage(prompt)}
                    activeOpacity={0.7}
                  >
                    <Text className="text-sm text-foreground">{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                padding: 16,
                paddingBottom: 8,
                gap: 12,
              }}
              onContentSizeChange={scrollToBottom}
              renderItem={({ item }) => <MessageBubble message={item} />}
              ListFooterComponent={
                isStreaming &&
                messages[messages.length - 1]?.role === "assistant" &&
                !messages[messages.length - 1]?.content ? (
                  <View className="flex-row items-center gap-2 px-4 py-2">
                    <ActivityIndicator />
                    <Text className="text-muted-foreground text-sm">
                      Denke nach...
                    </Text>
                  </View>
                ) : null
              }
            />
          )}

          {/* Input Bar */}
          <View className="border-t border-border bg-card px-4 py-3">
            <View className="flex-row items-end gap-2">
              <TextInput
                ref={inputRef}
                className="flex-1 border border-border rounded-2xl px-4 py-2.5 text-foreground bg-background max-h-24"
                placeholder="Nachricht schreiben..."
                placeholderTextColor={colors.grey2}
                value={input}
                onChangeText={setInput}
                multiline
                returnKeyType="default"
                editable={!isStreaming}
                style={{ color: colors.foreground }}
              />
              <TouchableOpacity
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  input.trim() && !isStreaming
                    ? "bg-primary"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
                onPress={() => sendMessage()}
                disabled={!input.trim() || isStreaming}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={
                    input.trim() && !isStreaming ? "#fff" : colors.grey2
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <View
      className={`flex-row ${isUser ? "justify-end" : "justify-start"}`}
    >
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary rounded-br-sm"
            : "bg-gray-100 dark:bg-gray-800 rounded-bl-sm"
        }`}
      >
        <Text
          className={`text-sm leading-5 ${
            isUser ? "text-white" : "text-foreground"
          }`}
          selectable
        >
          {message.content || " "}
        </Text>
      </View>
    </View>
  );
}
