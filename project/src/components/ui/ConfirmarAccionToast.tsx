import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { ConfirmToast } from "react-confirm-toast";

interface Props {
  visible: boolean;
  setVisible: Dispatch<SetStateAction<boolean>>;
  onConfirm: () => void;
  onCancel?: () => void; // opcional
  texto?: string;
  posicion?: "bottom-right" | "top-left" | "top-right" | "bottom-left";
  tema?: "light" | "dark" | "lilac" | "snow";
  modoModal?: boolean;
}

export const ConfirmarAccionToast = ({
  visible,
  setVisible,
  onConfirm,
  onCancel,
  texto = "¿Estás seguro de que deseas realizar esta acción?",
  posicion = "bottom-right",
  tema = "dark",
  modoModal = false,
}: Props) => {
  // Detecta cuando el toast se cierra (por cancelar o cerrar)
  const wasVisible = useRef(visible);

  useEffect(() => {
    if (wasVisible.current && !visible && onCancel) {
      onCancel();
    }
    wasVisible.current = visible;
  }, [visible, onCancel]);

  return (
    <ConfirmToast
      customFunction={onConfirm}
      showConfirmToast={visible}
      setShowConfirmToast={setVisible}
      toastText={texto}
      buttonYesText="Sí"
      buttonNoText="No"
      position={posicion}
      theme={tema}
      asModal={modoModal}
    />
  );
};