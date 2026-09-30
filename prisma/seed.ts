import { PrismaClient } from "@prisma/client";
import { auth } from "../lib/auth";

const prisma = new PrismaClient();

async function main() {
  const email = "clinica@exemplo.com";
  const password = "senhaSegura123!";

  // Verifica se o usuário já existe
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!existingUser) {
    // Cria o usuário utilizando a própria API do Better Auth para aplicar a criptografia correta
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: "Clínica Exemplo",
      },
    });
    console.log("✅ Usuário da clínica criado com sucesso via Better Auth!");
  } else {
    console.log("ℹ️ Usuário da clínica já existe no banco de dados.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });