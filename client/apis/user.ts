import { apis } from ".";

export const createUser = async (user: {
  clerkId: string;
  email: string;
  name: string;
}) => {
  try {
    const response = await apis.post("v1/users/create-user", {
      data: { ...user },
    });
    return response.data;
  } catch (error) {
    console.error(error);
  }
};
const useUserApi = () => {};

export default useUserApi;
