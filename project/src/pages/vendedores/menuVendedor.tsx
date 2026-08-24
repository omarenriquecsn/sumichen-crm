import React, { useState } from "react";
import { Menu, MenuItem, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { DashboardVendedorModal } from "../dashboard/DashboarVendedorModal";
import { ClientesModal } from "../clientes/ClientesModal";
import { ReunionesModal } from "../reuniones/ReunionesModal";
import { TicketsModal } from "../tickets/TicketsModal";
import { PedidosModal } from "../pedidos/PedidosModal";
import AnaliticaModal from "../analitica/AnaliticaModal";
import { User } from "@supabase/supabase-js";

interface MenuVendedorProps {
  vendedor: User | null;
}

type ModalType = "dashboard" | "clientes" | "reuniones" | "tickets" | "pedidos" | "analitica" | null;

const MenuVendedor: React.FC<MenuVendedorProps> = ({ vendedor }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openModal, setOpenModal] = useState<ModalType>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuItemClick = (modal: ModalType) => {
    setOpenModal(modal);
    setAnchorEl(null);
  };

  const handleCloseModal = () => {
    setOpenModal(null);
  };

  return (
    <div>
      <IconButton color="primary" onClick={handleClick}>
        <MenuIcon />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => handleMenuItemClick("dashboard")}>Dashboard</MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("clientes")}>Clientes</MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("reuniones")}>Reuniones</MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("tickets")}>Tickets</MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("pedidos")}>Pedidos</MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("analitica")}>Analitica</MenuItem>
      </Menu>

      <DashboardVendedorModal
        vendedor={vendedor as User}
        isOpenDashboard={openModal === "dashboard"}
        onClose={handleCloseModal}
      />
      <ClientesModal
        vendedor={vendedor as User}
        isOpenClientes={openModal === "clientes"}
        onClose={handleCloseModal}
      />
      <ReunionesModal
        vendedor={vendedor as User}
        isOpenReuniones={openModal === "reuniones"}
        onClose={handleCloseModal}
      />
      <TicketsModal
        vendedor={vendedor as User}
        isOpenTickets={openModal === "tickets"}
        onClose={handleCloseModal}
      />
      <PedidosModal
        vendedor={vendedor as User}
        isOpenPedidos={openModal === "pedidos"}
        onClose={handleCloseModal}
      />
      <AnaliticaModal
        vendedor={vendedor as User}
        isOpen={openModal === "analitica"}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default MenuVendedor;