import { Layout } from "../../components/layout/Layout";
import ProductosLogistica from "../logistica/ProductosLogistica";

/**
 * Página "Productos": inventario actual en **solo lectura** (cantidad por
 * almacén, lotes y fechas). Reutiliza la vista de la pestaña "Productos" de
 * Logística, pero sin permitir ajustes ni edición de vencimientos.
 * Los productos con stock en almacén se muestran primero y los de 0 al final.
 */
export const Productos = () => (
  <Layout
    title="Productos"
    subtitle="Inventario actual: cantidad, lotes y fechas."
  >
    <ProductosLogistica readonly />
  </Layout>
);

export default Productos;
