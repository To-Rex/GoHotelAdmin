import api from "@/api/client"
import type {
  Employee,
  EmployeeCreateRequest,
  EmployeeUpdateRequest,
} from "@/types/auth"

export async function getEmployees(params?: Record<string, string>) {
  const res = await api.get("/employees", { params })
  return res.data
}

export async function getEmployee(id: string): Promise<Employee> {
  const res = await api.get(`/employees/${id}`)
  return res.data
}

export async function createEmployee(
  data: EmployeeCreateRequest
): Promise<Employee> {
  const res = await api.post("/employees", data)
  return res.data
}

export async function updateEmployee(
  id: string,
  data: EmployeeUpdateRequest
): Promise<Employee> {
  const res = await api.put(`/employees/${id}`, data)
  return res.data
}

export async function deleteEmployee(id: string): Promise<void> {
  await api.delete(`/employees/${id}`)
}
