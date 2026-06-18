import { Quote, CommentHeap, MemberBio } from "./types";

export const INITIAL_QUOTES: Quote[] = [
  {
    id: "quote-ramsey",
    text: "No siento la menor humildad ante la vastedad de los cielos. Las estrellas pueden ser grandes, pero no pueden pensar ni amar; y estas son cualidades que me impresionan mucho más que el tamaño. Mi imagen del mundo está dibujada en perspectiva, y no como un modelo a escala. El primer plano está ocupado por seres humanos y las estrellas son todas tan pequeñas como monedas de tres peniques.",
    author: "Frank Ramsey",
    tag: "Filosofía",
    sharedBy: "javier_krick",
    createdAt: "2026-06-17T12:00:00Z"
  }
];

export const INITIAL_COMMENTS: CommentHeap[] = [];

export const INITIAL_MEMBER_BIOS: MemberBio[] = [
  {
    username: "javier_krick",
    name: "Javier Krick",
    bio: "Creador de este espacio interactivo. Busco impulsar un registro activo de ideas que no se pierdan en el murmullo de las conversaciones diarias, sino que actúen como un faro cognitivo permanente en nuestro grupo."
  }
];

