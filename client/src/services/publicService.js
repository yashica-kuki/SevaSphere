const API_URL = "/api/public";

const fetchData = async (endpoint) => {
  const response = await fetch(`${API_URL}${endpoint}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Something went wrong");
  }

  return result.data;
};

export const getPublicCauses = () => fetchData("/causes");

export const getPublicCauseBySlug = (slug) =>
  fetchData(`/causes/${encodeURIComponent(slug)}`);

export const getPublicNGOs = () => fetchData("/ngos?limit=100");

export const getPublicNGOById = (id) =>
  fetchData(`/ngos/${encodeURIComponent(id)}`);

export const getImpactOverview = () => fetchData("/impact");

export const getImpactStories = () => fetchData("/stories?limit=3");