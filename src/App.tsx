import { motion } from "framer-motion";
import { FaGithub, FaLinkedinIn } from "react-icons/fa";
import { About } from "./components/sections/About";
import { Navigation } from "./components/sections/Navigation";
import { Projects } from "./components/sections/Projects";
import { Arrow } from "./components/svgs/Arrow";
import { GithubGrid } from "./components/tools/GithubGrid";

function App() {
  const drawLine = {
    initial: { opacity: 0.8, pathLength: 0, strokeWidth: 0 },
    hover: {
      opacity: 0.8,
      pathLength: 1,
      strokeWidth: 3,
    },
  };

  const drawText = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { delay: 0.5, ease: "easeInOut", duration: 1 },
    },
  };

  return (
    <div className="px-8 my-12 mx-auto max-w-4xl font-inter font-bold">
      <Navigation />
      <div className="relative">
        <motion.div
          whileHover="hover"
          initial="initial"
          animate="animate"
          className="cursor-pointer hidden sm:block text-3xl text-gray-700"
        >
          <Arrow variants={drawLine} />
          <motion.div variants={drawText}>That's me</motion.div>
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, ease: "easeInOut", duration: 1 }}
        className="text-md text-gray-500 px-1 mt-2"
      >
        I'm a third-year{" "}
        <span className="text-blue-400">computer science student</span> at CU
        Boulder and a{" "}
        <span className="text-blue-400">software engineer intern</span> at
        Keysight Technology .
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
        <GithubGrid />
        <div id="projects"></div>
        <Projects />
        <div id="about"></div>
        <About />
      </motion.div>
      <div className="flex justify-center mt-20 h-12 font-normal text-sm">
        <p>
          Designed and developed by <strong>me</strong> with{" "}
          <a
            className="text-purple-400"
            target="_blank"
            href="https://framer.com/motion"
          >
            framer-motion
          </a>{" "}
          and{" "}
          <a
            className="text-sky-400"
            target="_blank"
            href="https://reactjs.org"
          >
            react
          </a>
        </p>
      </div>
    </div>
  );
}

export default App;
