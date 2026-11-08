export function authErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case "Configuration":
    case "OAuthSignin":
    case "OAuthSignIn":
      return "Login Google belum siap di server. Pastikan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan NEXTAUTH_URL sudah benar, lalu coba lagi.";
    case "AccessDenied":
      return "Akses ditolak. Akun Google yang dipilih tidak diizinkan masuk.";
    case "OAuthAccountNotLinked":
      return "Email ini sudah terhubung dengan metode login lain. Masuk dengan metode sebelumnya.";
    case "OAuthCallback":
    case "Callback":
      return "Terjadi masalah saat memproses balasan dari Google. Coba masuk lagi.";
    case "Verification":
      return "Tautan verifikasi sudah kedaluwarsa. Silakan coba lagi.";
    case "SessionTokenError":
      return "Sesi login tidak valid. Coba masuk lagi.";
    default:
      return "Gagal masuk dengan Google. Coba lagi beberapa saat lagi.";
  }
}
