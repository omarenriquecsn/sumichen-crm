import React from "react";
import { Layout } from "../../components/layout/Layout";
import { toast } from "react-toastify";
import {
  useRegistrarUsuario,
  RegistrarUsuarioPayload,
} from "../../hooks/useRegistrarUsuario";
import { UserPlus, Mail, Lock, User, Shield } from "lucide-react";

const estadoInicial: RegistrarUsuarioPayload = {
  nombre: "",
  apellido: "",
  email: "",
  password: "",
  rol: "vendedor",
};

const RegistrarUsuarios: React.FC = () => {
  const [formData, setFormData] = React.useState(estadoInicial);
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const { mutate: registrarUsuario, isPending } = useRegistrarUsuario();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (formData.password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    registrarUsuario(formData, {
      onSuccess: () => {
        toast.success(
          `Usuario ${formData.nombre} ${formData.apellido} registrado como ${
            formData.rol === "admin" ? "administrador" : "vendedor"
          }.`
        );
        setFormData(estadoInicial);
        setConfirmPassword("");
      },
      onError: (err) => {
        toast.error(err.message || "Error al registrar el usuario.");
      },
    });
  };

  return (
    <Layout
      title={`Registrar Usuarios`}
      subtitle="Crear nuevos vendedores o administradores"
    >
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="flex items-center space-x-2 mb-6">
            <div className="bg-blue-600 p-2 rounded-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              Nuevo Usuario
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Nombre
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Juan"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Apellido
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Pérez"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="usuario@sumichemint.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Rol
              </label>
              <div className="relative">
                <Shield className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <select
                  name="rol"
                  value={formData.rol}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Repite la contraseña"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Registrando..." : "Registrar Usuario"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default RegistrarUsuarios;