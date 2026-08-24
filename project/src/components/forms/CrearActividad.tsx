import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useAuth } from "../../context/useAuth";
import { Actividad } from "../../types";

type props = {
  onSubmit: (data: Partial<Actividad> | Actividad) => void;
  id?: string;
  accion: string;
};

const schema = yup.object({
  titulo: yup
    .string()
    .required("El título es obligatorio")
    .default("Actividad"),
  tipo: yup
    .mixed<"email" | "llamada" | "reunion" | "nota" | "tarea">()
    .oneOf(
      ["email", "llamada", "reunion", "nota", "tarea"],
      "El tipo es obligatorio"
    )
    .required("El tipo es obligatorio")
    .default("email"),
  descripcion: yup
    .string()
    .required("La descripción es obligatoria")
    .default("Actividad"),
  fecha: yup
    .date()
    .required("La fecha es obligatoria")
    .min(
      new Date(new Date().setHours(0, 0, 0, 0)),
      "La fecha no puede ser menor a hoy"
    ),
  fecha_vencimiento: yup
    .date()
    .required("La fecha de vencimiento es obligatoria")
    .typeError("La fecha de vencimiento debe ser una fecha válida")
    .min(
      yup.ref("fecha"),
      "La fecha de vencimiento no puede ser menor a la fecha"
    )
    .min(
      new Date(new Date().setHours(0, 0, 0, 0)),
      "La fecha de vencimiento no puede ser menor a hoy"
    ),
  cliente_id: yup.string().required("El cliente es obligatorio"),
  vendedor_id: yup.string().required("El vendedor es obligatorio"),
  completado: yup.boolean().default(false),
});

const CrearActividad = ({ id, onSubmit, accion }: props) => {
  const { currentUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<yup.InferType<typeof schema>>({
    resolver: yupResolver(schema),
    defaultValues: {
      cliente_id: id || "",
      vendedor_id: currentUser?.id || "",
      tipo: "email",
      titulo: "Actividad",
      descripcion: "",
      fecha: new Date(),
      fecha_vencimiento: new Date(),
      completado: false,
    },
  });

  // Adapt form data to Actividad type
  const handleFormSubmit = (data: yup.InferType<typeof schema>) => {
    const actividad: Partial<Actividad> = {
      ...data,
      fecha_creacion: new Date(),
    };
    onSubmit(actividad);
  };

  // Asegura que el vendedor_id y cliente_id se mantengan actualizados si cambian
  React.useEffect(() => {
    setValue("cliente_id", id || "");
    setValue("vendedor_id", currentUser?.id || "");
  }, [id, currentUser, setValue]);

   const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    const isTextarea = target.tagName === "TEXTAREA";

    if (e.key === "Enter" && !isTextarea) {
      e.preventDefault(); // bloquea Enter solo fuera del textarea
    }
  };

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(handleFormSubmit)}
      onKeyDown={handleKeyDown}
    >
      <div className="flex gap-2">
        <div className="flex flex-col w-1/2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título
          </label>
          <input
            type="text"
            {...register("titulo")}
            placeholder="Título"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 ${
              errors.titulo ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.titulo && (
            <p className="text-red-500 text-xs mt-1">{errors.titulo.message}</p>
          )}
        </div>
        <div className="w-1/2 flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Actividad
          </label>
          <select
            {...register("tipo")}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 ${
              errors.tipo ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="email">email</option>
            <option value="llamada">llamada</option>
            <option value="reunion">reunion</option>
            <option value="nota">nota</option>
            <option value="tarea">tarea</option>
          </select>
          {errors.tipo && (
            <p className="text-red-500 text-xs mt-1">{errors.tipo.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          {...register("descripcion")}
          placeholder="Descripción"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 min-h-[48px] ${
            errors.descripcion ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.descripcion && (
          <p className="text-red-500 text-xs mt-1">
            {errors.descripcion.message}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <div className="w-1/2">
          <label
            htmlFor="fecha"
            className="block text-sm font-medium text-gray-700"
          >
            Fecha
          </label>
          <input
            type="date"
            {...register("fecha")}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 ${
              errors.fecha ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.fecha && (
            <p className="text-red-500 text-xs mt-1">{errors.fecha.message}</p>
          )}
        </div>

        <div className="w-1/2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Vencimiento
          </label>
          <input
            type="date"
            {...register("fecha_vencimiento")}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 ${
              errors.fecha_vencimiento ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.fecha_vencimiento && (
            <p className="text-red-500 text-xs mt-1">
              {errors.fecha_vencimiento.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-6 py-2 rounded-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {accion || "Crear Actividad"}
        </button>
      </div>
    </form>
  );
};

export default CrearActividad;
