import { apis } from ".";
import { AxiosError } from "axios";
import { IUser } from "../types/user.types";

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
const useUserApi = () => {
  const makeProfile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await apis.post("/make-profile", {
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error making profile:", error);
      if (error && typeof error === "object" && "isAxiosError" in error) {
        // Now TypeScript knows this is an AxiosError
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new Error(
          axiosError.response?.data?.message ?? "Failed to make profile"
        );
      }
      throw error;
    }
  };

  const getMyProfile = async (): Promise<IUser> => {
    try {
      const { data } = await apis.get("v1/users/my-profile");
      return data.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const updateProfile = async (user: IUser) => {
    try {
      const response = await apis.put("v1/users/update-profile", {
        data: { ...user },
      });
      return response.data;
    } catch (error) {
      console.error(error);
    }
  };
  return {
    makeProfile,
    getMyProfile,
    updateProfile,
  };
};

export default useUserApi;
