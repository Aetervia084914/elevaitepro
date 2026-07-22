export async function getStorage() {
  const data = localStorage.getItem('career_app_storage');
  return data ? JSON.parse(data) : {};
}

export async function setFlag(key, value) {
  const data = await getStorage();
  data[key] = value;
  localStorage.setItem('career_app_storage', JSON.stringify(data));
}

export async function clearStorage() {
  localStorage.removeItem('career_app_storage');
}
