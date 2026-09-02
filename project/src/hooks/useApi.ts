import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";
import { User } from "@supabase/supabase-js";
import {
  Actividad,
  Cliente,
  formProducto,
  Oportunidad,
  Pedido,
  PedidoDb,
  Producto,
  ProductoDb,
  Reunion,
  Transporte,
} from "../types";
import { Ticket } from "../types";
import {
  Zona,
  Conversacion,
  Mensaje,
  LeadsResponse,
  MenuBienvenida,
} from "../types";

/**
 * Hook ÚNICO que agrupa todas las consultas y mutaciones de la API.
 *
 * Reemplaza la duplicación entre `useSupabase.ts` y `useAdmin.ts`:
 *
 * - Cada sub-hook acepta un `vendedorId` OPCIONAL como alcance:
 *   · Si se pasa (modo admin, ej. VendedorPanel) acota los datos a ese vendedor.
 *   · Si NO se pasa (modo vendedor) usa el id del usuario autenticado.
 *
 * - Al crear clientes/pedidos/actividades/reuniones/tickets/oportunidades, el
 *   `vendedor_id` se resuelve así: vendedorId explícito (admin) > dueño del
 *   cliente > usuario logueado. (ver `resolverVendedorId`)
 *
 * `useSupabase` y `useAdmin` son simples alias de este hook (ver ambos archivos).
 */
export const useApi = () => {
  const URL = import.meta.env.VITE_BACKEND_URL;
  const queryClient = useQueryClient();
  const { session } = useAuth();

  /**
   * Resuelve qué vendedor corresponde a un cliente al crear un registro.
   * Prioridad: vendedorId explícito (admin) > dueño del cliente > usuario logueado.
   * El dueño del cliente se lee del propio registro (cliente.vendedor_id), sin
   * depender de la lista de vendedores (que además es admin-only en el backend).
   */
  const resolverVendedorId = (
    clienteId: string | undefined,
    vendedorIdExplicito: string | undefined,
    clientes: Cliente[] | undefined,
    currentUserId: string | undefined
  ) => {
    if (vendedorIdExplicito) return vendedorIdExplicito;
    const vendedorIdCliente = clientes?.find(
      (c) => c.id === clienteId
    )?.vendedor_id;
    return vendedorIdCliente || currentUserId;
  };

  // ---------- Clientes ----------

  // Obtener clientes (por vendedor si se pasa vendedorId, si no del usuario logueado)
  const useClientes = (vendedorId?: string) => {
    const { currentUser, session } = useAuth();
    const id = vendedorId ?? currentUser?.id;
    return useQuery<Cliente[]>({
      queryKey: ["clientes", id],
      queryFn: async () => {
        if (!currentUser || !session?.access_token)
          throw new Error("Usuario no logueado o sin sesión");
        const clientesData = await fetch(`${URL}/clientes/${id}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
        });
        const data: Promise<Cliente[]> = await clientesData.json();
        return data || [];
      },
      enabled: !!currentUser,
      staleTime: 1000 * 60 * 5,
      retry: 1,
    });
  };

  // Crear cliente (se asigna al vendedor del alcance, o al usuario logueado)
  const useCrearCliente = (vendedorId?: string) => {
    return useMutation({
      mutationFn: async ({
        clienteData,
        currentUser,
      }: {
        clienteData: Partial<Cliente>;
        currentUser: Partial<User>;
      }) => {
        if (!currentUser || !session?.access_token)
          throw new Error("Usuario no autenticado o no hay token");

        if (!currentUser.id) throw new Error("Usuario no autenticado");
        clienteData.vendedor_id = vendedorId ?? currentUser.id;
        const response = await fetch(`${URL}/clientes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify(clienteData),
        });
        if (!response.ok) {
          throw new Error("El cliente ya existe o hubo un error al crearlo");
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["clientes"] });
      },
    });
  };

  // Actualizar cliente (ajusta el estado según la etapa de venta)
  const useActualizarCliente = () => {
    return useMutation({
      mutationFn: async ({
        clienteData,
        currentUser,
      }: {
        clienteData: Partial<Cliente>;
        currentUser: User;
      }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        if (
          clienteData.etapa_venta === "cerrado" &&
          clienteData.estado !== "inactivo"
        ) {
          clienteData.estado = "activo";
        }
        if (
          clienteData.etapa_venta === "inicial" &&
          clienteData.estado !== "inactivo"
        ) {
          clienteData.estado = "prospecto";
        }

        const response = await fetch(`${URL}/clientes/${clienteData.id}`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(clienteData),
        });
        if (!response.ok) {
          throw new Error("Error al actualizar el cliente");
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["clientes"] });
      },
    });
  };

  // ---------- Pedidos ----------

  // Obtener pedidos (por vendedor si se pasa vendedorId, si no del usuario logueado)
  const usePedidos = (vendedorId?: string) => {
    const { currentUser, session } = useAuth();
    const id = vendedorId ?? currentUser?.id;
    return useQuery({
      queryKey: ["pedidos", id],
      queryFn: async () => {
        if (!currentUser || !session?.access_token)
          throw new Error("Usuario no logueado o sin sesión");
        const pedidosData = await fetch(`${URL}/pedidos/${id}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
        });
        const data: Promise<Pedido[]> = await pedidosData.json();
        return data || [];
      },
      enabled: !!currentUser,
      staleTime: 1000 * 60 * 5,
      retry: 1,
    });
  };

  type CrearPedidoParams = {
    pedidoData: Partial<Pedido>;
    productosPedido: formProducto[];
    currentUser: User;
    archivoAdjunto: FileList | File | null;
  };

  // Crear pedido + subir evidencia (PDF) si viene adjunta
  const useCrearPedido = (vendedorId?: string) => {
    const { data: clientes } = useClientes();
    return useMutation({
      mutationFn: async ({
        pedidoData,
        productosPedido,
        currentUser,
        archivoAdjunto,
      }: CrearPedidoParams) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const vendedorResuelto = resolverVendedorId(
          pedidoData.cliente_id,
          vendedorId,
          clientes,
          currentUser.id
        );

        const pedidoDB: PedidoDb = {
          vendedor_id: vendedorResuelto || currentUser.id,
          cliente_id: pedidoData.cliente_id || "",
          impuestos:
            pedidoData.impuestos && pedidoData.impuestos > 0 ? "iva" : "exento",
          moneda: pedidoData.moneda || "usd",
          tipo_pago: pedidoData.tipo_pago || "contado",
          transporte: pedidoData.transporte || "interno",
          transporte_detalle:
            pedidoData.transporte === "externo"
              ? pedidoData.transporte_detalle
              : undefined,
          dias_credito: pedidoData.dias_credito,
          fecha_entrega: pedidoData.fecha_entrega || new Date(),
          notas: pedidoData.notas,
        };
        const productosFormateados = productosPedido.map((p: ProductoDb) => ({
          producto_id: p.producto_id,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
          precio_base: p.precio_base,
          porcentaje_negociacion: p.porcentaje_negociacion,
        }));

        // 1. Crear el pedido
        let pedidoId = null;
        const response = await fetch(`${URL}/pedidos`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            ...pedidoDB,
            productos: productosFormateados,
          }),
        });
        if (!response.ok) {
          throw new Error("Error al crear el pedido");
        }
        const data = await response.json();
        pedidoId = data.id || data.pedido_id || null;

        // 2. Si hay archivo adjunto y se obtuvo el id, subirlo a /pedidos/:id/evidencia
        const archivos: File[] =
          archivoAdjunto instanceof File
            ? [archivoAdjunto]
            : archivoAdjunto
              ? Array.from(archivoAdjunto)
              : [];

        if (archivos.length > 0 && pedidoId) {
          const formData = new FormData();
          archivos.forEach((file) => {
            formData.append("files", file);
          });
          const evidenciaRes = await fetch(
            `${URL}/pedidos/${pedidoId}/evidencia`,
            {
              method: "POST",
              credentials: "include",
              headers: {
                Authorization: `Bearer ${session?.access_token}`,
                // No poner Content-Type, el navegador lo setea automáticamente para FormData
              },
              body: formData,
            }
          );
          if (!evidenciaRes.ok) {
            throw new Error("Error al subir la evidencia del pedido");
          }
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      },

      onError: (error: unknown) => {
        if (error instanceof Error) throw new Error(error.message);
      },
    });
  };

  // Actualizar pedido
  const useActualizarPedido = () => {
    return useMutation({
      mutationFn: async ({
        pedidoData,
        currentUser,
      }: {
        pedidoData: Partial<Pedido>;
        currentUser: User;
      }) => {
        if (!currentUser) throw new Error();
        const response = await fetch(`${URL}/pedidos/${pedidoData.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify(pedidoData),
        });
        if (!response.ok) {
          throw new Error("Error al actualizar el pedido");
        }
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      },
    });
  };

  // Cancelar (eliminar) un pedido
  const useCancelarPedido = () => {
    const { session } = useAuth();
    return useMutation({
      mutationFn: async (id: string) => {
        const response = await fetch(`${URL}/pedidos/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Error al cancelar el pedido");
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      },
    });
  };

  // ---------- Transporte ----------

  // Obtener transporte de un pedido
  const useTransportePedido = (pedidoId?: string) => {
    const { session } = useAuth();
    return useQuery({
      queryKey: ["transporte", pedidoId],
      queryFn: async () => {
        if (!pedidoId || !session?.access_token) return null;
        const response = await fetch(`${URL}/transporte/pedido/${pedidoId}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
        });
        if (!response.ok) return null;
        return (await response.json()) as Transporte;
      },
      enabled: !!pedidoId,
    });
  };

  // Crear o actualizar el transporte de un pedido
  const useGuardarTransporte = () => {
    const { session } = useAuth();
    return useMutation({
      mutationFn: async ({
        pedidoId,
        transporteData,
      }: {
        pedidoId: string;
        transporteData: Partial<Transporte>;
      }) => {
        if (!session?.access_token) throw new Error("No autenticado");
        const response = await fetch(
          `${URL}/transporte/pedido/${pedidoId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            credentials: "include",
            body: JSON.stringify(transporteData),
          }
        );
        if (!response.ok) {
          throw new Error("Error al guardar el transporte");
        }
        return response.json();
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: ["transporte", variables.pedidoId],
        });
        queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      },
    });
  };

  // ---------- Actividades ----------

  // Obtener actividades (por vendedor si se pasa vendedorId, si no del usuario logueado)
  const useActividades = (vendedorId?: string) => {
    const { currentUser } = useAuth();
    const id = vendedorId ?? currentUser?.id;
    return useQuery({
      queryKey: ["actividades", id],
      queryFn: async () => {
        if (!currentUser) return [];
        const actividadesData = await fetch(`${URL}/actividades/${id}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
        }).then((response) => response.json());
        const data: Promise<Actividad[]> = actividadesData;
        return data || [];
      },
      enabled: !!currentUser,
    });
  };

  type CrearActividadParams = {
    actividadData: Partial<Actividad>;
    currentUser: Partial<User>;
  };

  // Crear actividad (asigna el vendedor resuelto)
  const useCrearActividad = (vendedorId?: string) => {
    const { data: clientes } = useClientes();
    return useMutation({
      mutationFn: async ({
        actividadData,
        currentUser,
      }: CrearActividadParams) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const vendedorResuelto = resolverVendedorId(
          actividadData.cliente_id,
          vendedorId,
          clientes,
          currentUser.id
        );
        const response = await fetch(`${URL}/actividades`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            ...actividadData,
            vendedor_id: vendedorResuelto || currentUser.id,
          }),
        });
        if (!response.ok) {
          throw new Error("Error al crear la actividad");
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["actividades"] });
      },
    });
  };

  // Actualizar actividad
  const useActualizarActividad = () => {
    const { session } = useAuth();
    return useMutation({
      mutationFn: async (actividadData: Partial<Actividad>) => {
        const response = await fetch(`${URL}/actividades/${actividadData.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify(actividadData),
        });
        if (!response.ok) {
          throw new Error("Error al actualizar la actividad");
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["actividades"] });
      },
    });
  };

  // Eliminar actividad (y su reunión/ticket asociada según el tipo)
  const useEliminarActividad = () => {
    const { session } = useAuth();
    return useMutation({
      mutationFn: async (actividad: Actividad) => {
        if (actividad.tipo === "reunion" && actividad.id_tipo_actividad) {
          const reunionRes = await fetch(
            `${URL}/reuniones/${actividad.id_tipo_actividad}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
              },
              credentials: "include",
            }
          );
          if (!reunionRes.ok) {
            throw new Error("Error al eliminar la reunión");
          }
        }

        if (actividad.tipo === "tarea" && actividad.id_tipo_actividad) {
          const ticketRes = await fetch(
            `${URL}/tickets/${actividad.id_tipo_actividad}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
              },
              credentials: "include",
            }
          );
          if (!ticketRes.ok) {
            throw new Error("Error al eliminar el ticket");
          }
        }

        const actividadRes = await fetch(`${URL}/actividades/${actividad.id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
        });
        if (!actividadRes.ok) {
          throw new Error("Error al eliminar la actividad");
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["actividades"] });
        queryClient.invalidateQueries({ queryKey: ["reuniones"] });
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      },
    });
  };

  // ---------- Reuniones ----------

  // Obtener reuniones (por vendedor si se pasa vendedorId, si no del usuario logueado)
  const useReuniones = (vendedorId?: string) => {
    const { currentUser } = useAuth();
    const id = vendedorId ?? currentUser?.id;
    return useQuery({
      queryKey: ["reuniones", id],
      queryFn: async () => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const reunionesData = await fetch(`${URL}/reuniones/${id}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
        }).then((response) => response.json());
        const data: Promise<Reunion[]> = reunionesData;
        return data || [];
      },
      enabled: !!currentUser,
    });
  };

  // Crear reunión (asigna el vendedor resuelto)
  const useCrearReunion = (vendedorId?: string) => {
    const { data: clientes } = useClientes();
    return useMutation({
      mutationFn: async ({
        reunionData,
        currentUser,
      }: {
        reunionData: Partial<Reunion>;
        currentUser: Partial<User>;
      }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const vendedorResuelto = resolverVendedorId(
          reunionData.cliente_id,
          vendedorId,
          clientes,
          currentUser.id
        );
        const response = await fetch(`${URL}/reuniones`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            ...reunionData,
            vendedor_id: vendedorResuelto || currentUser.id,
          }),
        });
        if (!response.ok) {
          throw new Error("Error al crear la reunion");
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["reuniones"] });
        queryClient.invalidateQueries({ queryKey: ["actividades"] });
      },
    });
  };

  // Actualizar reunión
  const useActualizarReunion = () => {
    return useMutation({
      mutationFn: async ({
        ReunionData,
        currentUser,
      }: {
        ReunionData: Partial<Reunion>;
        currentUser: User;
      }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const response = await fetch(`${URL}/reuniones/${ReunionData.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify(ReunionData),
        });
        if (!response.ok) {
          throw new Error("Error al actualizar la reunion");
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["reuniones"] });
      },
    });
  };

  // Eliminar reunión
  const useEliminarReunion = () => {
    const { session } = useAuth();
    return useMutation({
      mutationFn: async (id: string) => {
        const response = await fetch(`${URL}/reuniones/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Error al eliminar la reunión");
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["reuniones"] });
      },
    });
  };

  // ---------- Tickets ----------

  // Obtener tickets (por vendedor si se pasa vendedorId, si no del usuario logueado)
  const useTickets = (vendedorId?: string) => {
    const { currentUser } = useAuth();
    const id = vendedorId ?? currentUser?.id;
    return useQuery({
      queryKey: ["tickets", id],
      queryFn: async () => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const ticketsData = await fetch(`${URL}/tickets/${id}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
        }).then((response) => response.json());
        const data: Promise<Ticket[]> = ticketsData;
        return (await data).length > 0 ? data : [];
      },
      enabled: !!currentUser,
    });
  };

  // Crear ticket (asigna el vendedor resuelto)
  const useCrearTicket = (vendedorId?: string) => {
    const { data: clientes } = useClientes();
    return useMutation({
      mutationFn: async ({
        ticketData,
        currentUser,
      }: {
        ticketData: Partial<Ticket>;
        currentUser: User;
      }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const vendedorResuelto = resolverVendedorId(
          ticketData.cliente_id,
          vendedorId,
          clientes,
          currentUser.id
        );
        const response = await fetch(`${URL}/tickets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            ...ticketData,
            vendedor_id: vendedorResuelto || currentUser.id,
          }),
        });
        if (!response.ok) {
          throw new Error("Error al crear el ticket");
        }
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      },
    });
  };

  // Actualizar ticket
  const useActualizarTicket = () => {
    return useMutation({
      mutationFn: async ({
        TicketData,
        currentUser,
      }: {
        TicketData: Partial<Ticket>;
        currentUser: User;
      }) => {
        if (!currentUser) throw new Error("Usuario no Autenticado");
        const response = await fetch(`${URL}/tickets/${TicketData.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify(TicketData),
        });
        if (!response.ok) {
          throw new Error("Error al actualizar el ticket");
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      },
    });
  };

  // Eliminar ticket
  const useEliminarTicket = () => {
    const { session } = useAuth();
    return useMutation({
      mutationFn: async (id: string) => {
        const response = await fetch(`${URL}/tickets/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Error al eliminar el ticket");
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      },
    });
  };

  // ---------- Oportunidades (pipeline) ----------

  // Obtener oportunidades (por vendedor si se pasa vendedorId, si no del usuario logueado)
  const useOportunidades = (vendedorId?: string) => {
    const { currentUser } = useAuth();
    const id = vendedorId ?? currentUser?.id;
    return useQuery({
      queryKey: ["oportunidades", id],
      queryFn: async () => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const oportunidadData = await fetch(`${URL}/oportunidades/${id}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
        }).then((res) => res.json());
        const data: Promise<Oportunidad[]> = oportunidadData;
        return data || [];
      },
      enabled: !!currentUser,
    });
  };

  // Crear oportunidad (asigna el vendedor resuelto)
  const useCrearOportunidades = (vendedorId?: string) => {
    const { data: clientes } = useClientes();
    return useMutation({
      mutationFn: async ({
        oportunidadData,
        currentUser,
      }: {
        oportunidadData: Partial<Oportunidad>;
        currentUser: User;
      }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const vendedorResuelto = resolverVendedorId(
          oportunidadData.cliente_id,
          vendedorId,
          clientes,
          currentUser.id
        );
        const response = await fetch(`${URL}/oportunidades`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            ...oportunidadData,
            vendedor_id: vendedorResuelto || currentUser.id,
          }),
        });
        if (!response.ok) {
          throw new Error("Error al crear la oportunidad");
        }
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      },
    });
  };

  // Actualizar oportunidad
  const useActualizarOportunidad = () => {
    return useMutation({
      mutationFn: async ({
        OportunidadData,
        currentUser,
      }: {
        OportunidadData: Partial<Oportunidad>;
        currentUser: User;
      }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const response = await fetch(
          `${URL}/oportunidades/${OportunidadData.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            credentials: "include",
            body: JSON.stringify(OportunidadData),
          }
        );
        if (!response.ok) {
          throw new Error("Error al actualizar la reunion");
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      },
    });
  };

  // Eliminar oportunidad
  const useEliminarOportunidad = () => {
    const { session } = useAuth();
    return useMutation({
      mutationFn: async (id: string) => {
        const response = await fetch(`${URL}/oportunidades/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Error al eliminar la oportunidad");
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      },
    });
  };

  // ---------- Productos ----------

  // Obtener productos (sin alcance por vendedor)
  const useProductos = () => {
    return useQuery({
      queryKey: ["productos"],
      queryFn: async () => {
        const productos = await fetch(`${URL}/productos`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
        }).then((response) => response.json());
        return productos || [];
      },
      staleTime: 1000 * 60 * 5,
      retry: 1,
    });
  };

  // Crear producto
  const useCrearProducto = () => {
    return useMutation({
      mutationFn: async ({ productoData }: { productoData: Partial<Producto> }) => {
        const response = await fetch(`${URL}/productos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify(productoData),
        });
        if (!response.ok) {
          throw new Error("Error al crear el producto");
        }
        return response.json();
      },
    });
  };

  // ---------- Metas ----------

  // Obtener metas (por vendedor si se pasa vendedorId, si no del usuario logueado)
  const useMetas = (vendedorId?: string) => {
    const { currentUser, session } = useAuth();
    const id = vendedorId ?? currentUser?.id;
    return useQuery({
      queryKey: ["metas", id],
      queryFn: async () => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const metas = await fetch(`${URL}/metas/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
        }).then((response) => response.json());
        return metas || [];
      },
      staleTime: 1000 * 60 * 5,
      retry: 1,
    });
  };

  // ---------- Zonas ----------
  const useZonas = (vendedorId?: string) => {
    const { currentUser, session } = useAuth();
    return useQuery<Zona[]>({
      queryKey: ["zonas", vendedorId ?? currentUser?.id],
      queryFn: async () => {
        if (!currentUser || !session?.access_token)
          throw new Error("Usuario no logueado o sin sesión");
        const res = await fetch(`${URL}/zonas`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        const data = await res.json();
        return data || [];
      },
      enabled: !!currentUser,
      staleTime: 1000 * 60 * 5,
      retry: 1,
    });
  };

  const useCrearZona = () => {
    return useMutation({
      mutationFn: async ({ zonaData }: { zonaData: Partial<Zona> }) => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/zonas`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify(zonaData),
        });
        if (!res.ok) throw new Error("Error al crear zona");
        return res.json();
      },
    });
  };

  const useActualizarZona = () => {
    return useMutation({
      mutationFn: async ({ id, zonaData }: { id: string; zonaData: Partial<Zona> }) => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/zonas/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify(zonaData),
        });
        if (!res.ok) throw new Error("Error al actualizar zona");
        return res.json();
      },
    });
  };

  const useEliminarZona = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/zonas/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error("Error al eliminar zona");
        if (res.status === 204) return null;
        return res.json();
      },
    });
  };

  const useAsignarVendedorZona = () => {
    return useMutation({
      mutationFn: async ({ zonaId, vendedorId }: { zonaId: string; vendedorId: string }) => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/zonas/${zonaId}/vendedores`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify({ vendedor_id: vendedorId }),
        });
        if (!res.ok) throw new Error("Error al asignar vendedor a zona");
        return res.json();
      },
    });
  };

  const useDesasignarVendedorZona = () => {
    return useMutation({
      mutationFn: async ({ zonaId, vendedorId }: { zonaId: string; vendedorId: string }) => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/zonas/${zonaId}/vendedores/${vendedorId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error("Error al desasignar vendedor");
        if (res.status === 204) return null;
        return res.json();
      },
    });
  };

  const useVendedoresDeZona = (zonaId: string) => {
    const { session } = useAuth();
    return useQuery({
      queryKey: ["vendedores-zona", zonaId],
      queryFn: async () => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/zonas/${zonaId}/vendedores`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        return res.json();
      },
      enabled: !!session?.access_token && !!zonaId,
    });
  };

  // ---------- Leads ----------
  const useLeads = (vendedorId?: string, filtros?: {
  zona_id?: string;
  estado?: string;
  origen?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}) => {
    const { currentUser, session } = useAuth();
    const id = vendedorId ?? currentUser?.id;
    return useQuery<LeadsResponse>({
      queryKey: ["leads", id, filtros],
      queryFn: async () => {
        if (!currentUser || !session?.access_token)
          throw new Error("Usuario no logueado o sin sesión");
        const params = new URLSearchParams();
        if (filtros?.zona_id) params.append("zona_id", filtros.zona_id);
        if (filtros?.estado) params.append("estado", filtros.estado);
        if (filtros?.origen) params.append("origen", filtros.origen);
        if (filtros?.desde) params.append("desde", filtros.desde);
        if (filtros?.hasta) params.append("hasta", filtros.hasta);
        if (filtros?.page) params.append("page", String(filtros.page));
        if (filtros?.limit) params.append("limit", String(filtros.limit));
        const res = await fetch(`${URL}/leads?${params}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        const data = (await res.json()) as LeadsResponse;
        return data;
      },
      enabled: !!currentUser,
      staleTime: 1000 * 60 * 2,
      retry: 1,
    });
  };

  const useLeadById = (id: string) => {
    const { session } = useAuth();
    return useQuery({
      queryKey: ["lead", id],
      queryFn: async () => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/leads/${id}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        if (!res.ok) return null;
        return res.json();
      },
      enabled: !!session?.access_token && !!id,
    });
  };

  const useCrearLeadWeb = () => {
    return useMutation({
      mutationFn: async (leadData: {
        origen: string;
        tipo_web: string;
        datos_contacto: { nombre: string; telefono: string; email?: string; instagram_handle?: string; mensaje_inicial: string };
        metadata?: Record<string, unknown>;
      }) => {
        // Endpoint público SIN token
        const res = await fetch(`${URL}/leads/web`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(leadData),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Error al crear lead" }));
          throw new Error(err.message);
        }
        return res.json();
      },
    });
  };

  const useAsignarLead = () => {
    return useMutation({
      mutationFn: async ({ leadId, zonaId }: { leadId: string; zonaId: string }) => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/leads/${leadId}/asignar`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify({ zona_id: zonaId }),
        });
        if (!res.ok) throw new Error("Error al asignar lead");
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        queryClient.invalidateQueries({ queryKey: ["lead"] });
        queryClient.invalidateQueries({ queryKey: ["conversaciones"] });
        queryClient.invalidateQueries({ queryKey: ["conversacion"] });
        queryClient.invalidateQueries({ queryKey: ["conversacion-lead"] });
        queryClient.invalidateQueries({ queryKey: ["historial-reasignaciones"] });
      },
    });
  };

  const useReasignarLead = () => {
    return useMutation({
      mutationFn: async ({ leadId, vendedorId, motivo }: { leadId: string; vendedorId: string | null; motivo: string }) => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/leads/${leadId}/reasignar`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify({ vendedor_id: vendedorId, motivo }),
        });
        if (!res.ok) throw new Error("Error al reasignar lead");
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        queryClient.invalidateQueries({ queryKey: ["lead"] });
        queryClient.invalidateQueries({ queryKey: ["conversaciones"] });
        queryClient.invalidateQueries({ queryKey: ["conversacion"] });
        queryClient.invalidateQueries({ queryKey: ["conversacion-lead"] });
        queryClient.invalidateQueries({ queryKey: ["historial-reasignaciones"] });
      },
    });
  };

  const useConvertirLead = () => {
    return useMutation({
      mutationFn: async ({ leadId, datos_cliente }: { leadId: string; datos_cliente?: Record<string, unknown> }) => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/leads/${leadId}/convertir`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify({ datos_cliente: datos_cliente || {} }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Error al convertir lead" }));
          throw new Error(err.message || "Error al convertir lead");
        }
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        queryClient.invalidateQueries({ queryKey: ["lead"] });
        queryClient.invalidateQueries({ queryKey: ["conversaciones"] });
        queryClient.invalidateQueries({ queryKey: ["conversacion"] });
        queryClient.invalidateQueries({ queryKey: ["clientes"] });
      },
    });
  };

  const usePerderLead = () => {
    return useMutation({
      mutationFn: async (leadId: string) => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/leads/${leadId}/perder`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error("Error al marcar lead como perdido");
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        queryClient.invalidateQueries({ queryKey: ["lead"] });
        queryClient.invalidateQueries({ queryKey: ["conversaciones"] });
        queryClient.invalidateQueries({ queryKey: ["conversacion"] });
      },
    });
  };

  const useHistorialReasignaciones = (leadId: string) => {
    const { session } = useAuth();
    return useQuery({
      queryKey: ["historial-reasignaciones", leadId],
      queryFn: async () => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/leads/${leadId}/historial-reasignaciones`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        return res.json();
      },
      enabled: !!session?.access_token && !!leadId,
    });
  };

  // ---------- Conversaciones ----------
  const useConversaciones = (vendedorId?: string, filtros?: { estado?: string; lead_id?: string }) => {
    const { currentUser, session } = useAuth();
    const id = vendedorId ?? currentUser?.id;
    return useQuery<Conversacion[]>({
      queryKey: ["conversaciones", id, filtros],
      queryFn: async () => {
        if (!currentUser || !session?.access_token)
          throw new Error("Usuario no logueado o sin sesión");
        const params = new URLSearchParams();
        if (filtros?.estado) params.append("estado", filtros.estado);
        if (filtros?.lead_id) params.append("lead_id", filtros.lead_id);
        const res = await fetch(`${URL}/conversaciones?${params}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        const data = await res.json();
        return data || [];
      },
      enabled: !!currentUser,
      staleTime: 1000 * 30,
      retry: 1,
      refetchInterval: 60000, // Polling 1 min para lista de chats
    });
  };

  const useConversacionById = (id: string) => {
    const { session } = useAuth();
    return useQuery({
      queryKey: ["conversacion", id],
      queryFn: async () => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/conversaciones/${id}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        if (!res.ok) return null;
        return res.json();
      },
      enabled: !!session?.access_token && !!id,
    });
  };

  const useConversacionByLead = (leadId: string) => {
    const { session } = useAuth();
    return useQuery({
      queryKey: ["conversacion-lead", leadId],
      queryFn: async () => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/conversaciones/lead/${leadId}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        if (res.status === 404) return null;
        return res.json();
      },
      enabled: !!session?.access_token && !!leadId,
    });
  };

  const useAbrirConversacion = () => {
    return useMutation({
      mutationFn: async ({ leadId, vendedorId, canal }: { leadId: string; vendedorId?: string; canal?: string }) => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/conversaciones/lead/${leadId}/abrir`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify({ vendedor_id: vendedorId, canal }),
        });
        if (!res.ok) throw new Error("Error al abrir conversación");
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["conversaciones"] });
        queryClient.invalidateQueries({ queryKey: ["conversacion"] });
        queryClient.invalidateQueries({ queryKey: ["conversacion-lead"] });
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        queryClient.invalidateQueries({ queryKey: ["lead"] });
      },
    });
  };

  const useEnviarMensaje = () => {
    return useMutation({
      mutationFn: async ({ conversacionId, contenido, tipo, metadata }: {
        conversacionId: string;
        contenido: string;
        tipo?: string;
        metadata?: Record<string, unknown>;
      }) => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/conversaciones/${conversacionId}/mensajes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify({ contenido, tipo, metadata }),
        });
        if (!res.ok) throw new Error("Error al enviar mensaje");
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["mensajes"] });
        queryClient.invalidateQueries({ queryKey: ["conversaciones"] });
        queryClient.invalidateQueries({ queryKey: ["conversacion"] });
      },
    });
  };

  const useMensajes = (conversacionId: string, page = 1, limit = 50) => {
    const { session } = useAuth();
    return useQuery<Mensaje[]>({
      queryKey: ["mensajes", conversacionId, page],
      queryFn: async () => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/conversaciones/${conversacionId}/mensajes?page=${page}&limit=${limit}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        return res.json();
      },
      enabled: !!session?.access_token && !!conversacionId,
      staleTime: 5000,
      refetchInterval: 5000, // Polling 5s para chat en tiempo real (fase 1)
    });
  };

  const useCerrarConversacion = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/conversaciones/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error("Error al cerrar conversación");
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["conversaciones"] });
        queryClient.invalidateQueries({ queryKey: ["conversacion"] });
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        queryClient.invalidateQueries({ queryKey: ["lead"] });
      },
    });
  };

  const useMenuBienvenida = () => {
    const { session } = useAuth();
    return useQuery<MenuBienvenida>({
      queryKey: ["menu-bienvenida"],
      queryFn: async () => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/menu-bienvenida`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error("Error al obtener configuración del menú");
        return res.json();
      },
      enabled: !!session?.access_token,
    });
  };

  const useActualizarMenuBienvenida = () => {
    return useMutation({
      mutationFn: async (data: Partial<MenuBienvenida>) => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/menu-bienvenida`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          credentials: "include",
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Error al guardar configuración" }));
          throw new Error(err.message || "Error al guardar configuración");
        }
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["menu-bienvenida"] });
      },
    });
  };

  // Documentos de utilidades (carpeta uploads/utilidades: horario, condiciones
  // de despacho). Se muestran en Configuración → Documentos.
  const useUtilidades = () => {
    return useQuery<
      { nombre: string; tamaño: number; url: string }[]
    >({
      queryKey: ["utilidades"],
      queryFn: async () => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(`${URL}/utilidades`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error("Error al obtener los documentos");
        return res.json();
      },
      enabled: !!session?.access_token,
      staleTime: 1000 * 60 * 5,
    });
  };

  // Subir un documento nuevo a utilidades (solo admins).
  const useSubirUtilidad = () => {
    return useMutation<{ message: string; nombre: string; url: string }, Error, File>({
      mutationFn: async (file: File) => {
        if (!session?.access_token) throw new Error("Sin token");
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${URL}/utilidades`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          credentials: "include",
          body: formData,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Error al subir el documento");
        }
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["utilidades"] });
      },
    });
  };

  // Eliminar un documento de utilidades (solo admins).
  const useEliminarUtilidad = () => {
    return useMutation<{ message: string }, Error, string>({
      mutationFn: async (nombre: string) => {
        if (!session?.access_token) throw new Error("Sin token");
        const res = await fetch(
          `${URL}/utilidades/${encodeURIComponent(nombre)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session?.access_token}` },
            credentials: "include",
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Error al eliminar el documento");
        }
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["utilidades"] });
      },
    });
  };

  return {
    useClientes,
    useActividades,
    useReuniones,
    useEliminarReunion,
    useTickets,
    usePedidos,
    useOportunidades,
    useCrearCliente,
    useCrearActividad,
    useCrearReunion,
    useCrearTicket,
    useCrearPedido,
    useCrearOportunidades,
    useActualizarCliente,
    useActualizarReunion,
    useActualizarTicket,
    useActualizarPedido,
    useActualizarOportunidad,
    useProductos,
    useMetas,
    useCancelarPedido,
    useTransportePedido,
    useGuardarTransporte,
    useActualizarActividad,
    useEliminarActividad,
    useEliminarTicket,
    useEliminarOportunidad,
    useCrearProducto,
    // Zonas
    useZonas,
    useCrearZona,
    useActualizarZona,
    useEliminarZona,
    useAsignarVendedorZona,
    useDesasignarVendedorZona,
    useVendedoresDeZona,
    // Leads
    useLeads,
    useLeadById,
    useCrearLeadWeb,
    useAsignarLead,
    useReasignarLead,
    useConvertirLead,
    usePerderLead,
    useHistorialReasignaciones,
    // Conversaciones / Chat
    useConversaciones,
    useConversacionById,
    useConversacionByLead,
    useAbrirConversacion,
    useEnviarMensaje,
    useMensajes,
    useCerrarConversacion,
    // Menú de bienvenida (asistente WhatsApp)
    useMenuBienvenida,
    useActualizarMenuBienvenida,
    // Documentos de utilidades
    useUtilidades,
    useSubirUtilidad,
    useEliminarUtilidad,
  };
};