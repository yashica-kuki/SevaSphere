
import api from "./api";

const BASE_URL = "/admin/ngo-verifications";

export const getVerificationQueue = async (status) => {
  const response = await api.get(BASE_URL, {
    params: status ? { status } : {},
  });
  return response.data;
};

export const getVerificationDetails = async (ngoId) => {
  const response = await api.get(`${BASE_URL}/${ngoId}`);
  return response.data;
};

export const startVerificationReview = async (ngoId) => {
  const response = await api.post(`${BASE_URL}/${ngoId}/start-review`);
  return response.data;
};

export const reviewDocument = async (ngoId, documentId, decision, reason = "") => {
  const response = await api.patch(
    `${BASE_URL}/${ngoId}/documents/${documentId}`,
    { decision, reason }
  );
  return response.data;
};

export const decideVerification = async (ngoId, decision, note = "") => {
  const response = await api.patch(`${BASE_URL}/${ngoId}/decision`, {
    decision,
    note,
  });
  return response.data;
};

export const downloadNGODocument = async (documentId) => {
  const response = await api.get(
    `${BASE_URL}/documents/${documentId}/download`,
    { responseType: "blob" }
  );

  const blob = new Blob([response.data]);
  const objectUrl = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `ngo-document-${documentId}`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(objectUrl);
};
