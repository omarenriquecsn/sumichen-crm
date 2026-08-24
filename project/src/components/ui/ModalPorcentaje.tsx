import  { useEffect, useRef, useState } from "react";

interface ModalPorcentajeProps {
    open: boolean;
    initialValue?: number;
    onClose: () => void;
    onConfirm: (value: number) => void;
    title?: string;
    // opcional: min/max del porcentaje
    min?: number;
    max?: number;
}

export default function ModalPorcentaje({
    open,
    initialValue = 0,
    onClose,
    onConfirm,
    title = "Porcentaje de la negociación",
    min = 0,
    max = 100,
}: ModalPorcentajeProps) {
    const [value, setValue] = useState<string>(String(initialValue));
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (open) {
            setValue(String(initialValue));
            setError(null);
            // focusar input cuando se abre
            setTimeout(() => inputRef.current?.focus(), 0);
            // bloquear scroll body simple
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open, initialValue]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (!open) return;
            if (e.key === "Escape") onClose();
            if (e.key === "Enter") handleConfirm();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, value]);

    function validateAndParse(v: string): { ok: boolean; num?: number; message?: string } {
        if (v.trim() === "") return { ok: false, message: "Introduce un valor" };
        const num = Number(v);
        if (Number.isNaN(num)) return { ok: false, message: "Valor no válido" };
        if (!isFinite(num)) return { ok: false, message: "Valor no válido" };
        if (num < min || num > max) return { ok: false, message: `Valor entre ${min} y ${max}` };
        return { ok: true, num };
    }

    function handleConfirm() {
        const res = validateAndParse(value);
        if (!res.ok) {
            setError(res.message || "Valor inválido");
            return;
        }
        setError(null);
        onConfirm(Number(res.num!.toFixed(2)));
    }

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-porcentaje-title"
            style={{
                position: "fixed",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
        >
            <div
                onClick={onClose}
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.4)",
                }}
            />
            <div
                style={{
                    position: "relative",
                    width: 360,
                    maxWidth: "90%",
                    background: "#fff",
                    borderRadius: 8,
                    padding: 20,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                    zIndex: 1001,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="modal-porcentaje-title" style={{ margin: "0 0 12px 0", fontSize: 16 }}>
                    {title}
                </h2>

                <label style={{ display: "block", marginBottom: 8, fontSize: 13 }}>
                    Introduce el porcentaje ({min}% - {max}%)
                </label>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                        ref={inputRef}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            if (error) setError(null);
                        }}
                        style={{
                            flex: 1,
                            padding: "8px 10px",
                            fontSize: 14,
                            borderRadius: 4,
                            border: error ? "1px solid #e74c3c" : "1px solid #ccc",
                        }}
                        aria-label="porcentaje"
                    />
                    <span style={{ fontSize: 14, minWidth: 28, textAlign: "right" }}>%</span>
                </div>

                {error && (
                    <div style={{ marginTop: 8, color: "#e74c3c", fontSize: 13 }}>{error}</div>
                )}

                <div
                    style={{
                        marginTop: 16,
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: "8px 12px",
                            background: "#f0f0f0",
                            border: "1px solid #d0d0d0",
                            borderRadius: 6,
                            cursor: "pointer",
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        style={{
                            padding: "8px 12px",
                            background: "#2563eb",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                        }}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}