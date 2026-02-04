import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, disabled }: Props) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#1B3A2F",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonDisabled: {
    backgroundColor: "#9AA3A0"
  },
  label: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600"
  }
});
