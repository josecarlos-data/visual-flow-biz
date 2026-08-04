# Sales Navigator

Quiero desarrollar una aplicacion estilo power bi, donde se crearan usuarios, que seran los comerciales y las personas finales que acabaran consumiendo esos datos. 
El objetivo es crear un dashboard que ya iremos desarrollando y cada comercial pueda acceder asus ventas y no a lade los demas. 

para la cuenta de administrador, osea la mia, aparte del dasboard, habra otraa ventana de administracion, Esta ventana tendra varias subventas.
Una en la quese  aprobare la creacion de los nuevos usuarios y de los permisos.  de visualizacion y creacion de cada usuario.
Otra subventana donde se cargaran los datos nuevos en formato xls, de forma predetemirnada, csv u otros.
Esta carga de datos seran como tablas, cada xls o csv supondra actulizar una tabla.
En esta ventana se mostrara como un slicer para cada tabla de los datos.
Pinchan en el slicer aparecera la opcion de actualizar datos para poder subir el xls o csv. Exportar datos o previsualizar los datos  donde mostraran las 10 primeras filas con los encabezados. 

Posteriormente se te subira un archivo para que puedas crear la extructura de la base de datos que utilizaras
Es importante el criterio RLS, es decir que un comercial no pueda ver la ventas de otro comercial, salvo el jefe de los comerciales, o el encargado de zona, que podra ver las ventas de los comerciales de su zona/delegazion.
Estos permisos de autorizaciones superiores debe poder asignarlos el adminitrador desde la ventana administracion

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://visual-flow-biz.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/65bcac7d-b035-4e52-81e6-ed7fd20a5280).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
