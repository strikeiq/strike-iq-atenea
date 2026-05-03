import { redirect } from 'next/navigation'
// La importación del CRM vive dentro del Gestor (tab "Importar CRM")
// Esta ruta redirige allí para que el admin también lo use desde el sidebar
export default function ImportarPage() {
  redirect('/gestor')
}
