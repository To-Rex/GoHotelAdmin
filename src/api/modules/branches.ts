import api from "@/api/client"
import type {
  Branch,
  BranchCreateRequest,
  BranchUpdateRequest,
} from "@/types/branch"

export async function getBranches(params?: Record<string, string>) {
  const res = await api.get("/branches", { params })
  return res.data
}

export async function getBranch(id: string): Promise<Branch> {
  const res = await api.get(`/branches/${id}`)
  return res.data
}

export async function createBranch(data: BranchCreateRequest): Promise<Branch> {
  const res = await api.post("/branches", data)
  return res.data
}

export async function updateBranch(
  id: string,
  data: BranchUpdateRequest
): Promise<Branch> {
  const res = await api.put(`/branches/${id}`, data)
  return res.data
}

export async function getBranchFloors(id: string) {
  const res = await api.get(`/branches/${id}/floors`)
  return res.data
}
