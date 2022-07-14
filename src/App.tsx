import { motion } from "framer-motion";
import { useState } from "react";
import { FaGithub, FaLinkedinIn } from "react-icons/fa";
import { Arrow } from "./components/svgs/Arrow";

function App() {
  const [selected, setSelected] = useState(0);

  const links = [
    {
      text: "projects",
      href: "#projects",
    },
    {
      text: "about",
      href: "#about",
    },
    {
      text: "socials",
      href: "#socials",
    },
  ];

  return (
    <div className="px-8 my-12 mx-auto max-w-4xl font-inter font-bold">
      <div className="flex justify-between items-center mb-14">
        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          src="src/assets/logo.png"
          className="w-28"
          alt=""
        />

        <motion.ul
          className="flex gap-10 text-gray-500 text-lg"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{ delay: 0.5, duration: 1, ease: "easeInOut" }}
        >
          {links.map((link, index) => (
            <motion.li
              className="relative"
              onClick={() => setSelected(index)}
              key={index}
            >
              <a href={link.href}>{link.text}</a>
              {index === selected && (
                <motion.div
                  layoutId="links"
                  className="w-full h-4 -z-10 bottom-3 left-2 bg-[#ABC4FF55] absolute"
                ></motion.div>
              )}
            </motion.li>
          ))}
        </motion.ul>
      </div>
      <div className="relative">
        <Arrow />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, ease: "easeInOut", duration: 1 }}
          className="text-3xl text-gray-700"
        >
          That's me
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, ease: "easeInOut", duration: 1 }}
        className="w-3/4 text-md text-gray-500 px-1 mt-2"
      >
        I'm a third-year computer science student at CU Boulder and a software
        engineer intern at Keysight Technology.
        <div className="mt-8">
          <div className="flex gap-8 text-xl">
            <a
              href="https://github.com/camerontredoux"
              target={"_blank"}
              className="hover:text-[#ABC4FF]"
            >
              <FaGithub />
            </a>
            <a
              href="https://linkedin.com/in/camerontredoux"
              target={"_blank"}
              className="hover:text-[#ABC4FF]"
            >
              <FaLinkedinIn />
            </a>
          </div>
        </div>
        {/* insert github contribution board, and most recent projects list, do something for linked in maybe */}
        <div className="text-3xl text-gray-700 mt-44">Projects</div>
      </motion.div>
    </div>
  );
}

export default App;
