module.exports = {

   'nexys4-ddr': {
      name: "Digilent Nexys4 DDR",
      fpga: {
         vendor: 'Xilinx',
         family: 'Artix-7',
         type: 'XC7A100T',
         subtype: '1CSG324C',
         fullname: 'xc7a100tcsg324-1',
      },
      signals: [
         // master clock 100MHz
         { shdlName: "mclk", pin: "E3", isInput: true, isOutput: false },

         // CPU Reset
         { shdlName: "btnrst", pin: "C12", isInput: true, isOutput: false },

         // buttons
         { shdlName: "btnc", pin: "N17", isInput: true, isOutput: false },
         { shdlName: "btnr", pin: "M17", isInput: true, isOutput: false },
         { shdlName: "btnl", pin: "P17", isInput: true, isOutput: false },
         { shdlName: "btnu", pin: "M18", isInput: true, isOutput: false },
         { shdlName: "btnd", pin: "P18", isInput: true, isOutput: false },

         // switches
         { shdlName: "sw[0]", pin: "J15", isInput: true, isOutput: false },
         { shdlName: "sw[1]", pin: "L16", isInput: true, isOutput: false },
         { shdlName: "sw[2]", pin: "M13", isInput: true, isOutput: false },
         { shdlName: "sw[3]", pin: "R15", isInput: true, isOutput: false },
         { shdlName: "sw[4]", pin: "R17", isInput: true, isOutput: false },
         { shdlName: "sw[5]", pin: "T18", isInput: true, isOutput: false },
         { shdlName: "sw[6]", pin: "U18", isInput: true, isOutput: false },
         { shdlName: "sw[7]", pin: "R13", isInput: true, isOutput: false },
         { shdlName: "sw[8]", pin: "T8", isInput: true, isOutput: false },
         { shdlName: "sw[9]", pin: "U8", isInput: true, isOutput: false },
         { shdlName: "sw[10]", pin: "R16", isInput: true, isOutput: false },
         { shdlName: "sw[11]", pin: "T13", isInput: true, isOutput: false },
         { shdlName: "sw[12]", pin: "H6", isInput: true, isOutput: false },
         { shdlName: "sw[13]", pin: "U12", isInput: true, isOutput: false },
         { shdlName: "sw[14]", pin: "U11", isInput: true, isOutput: false },
         { shdlName: "sw[15]", pin: "V10", isInput: true, isOutput: false },

         // leds
         { shdlName: "ld[0]", pin: "H17", isInput: false, isOutput: true },
         { shdlName: "ld[1]", pin: "K15", isInput: false, isOutput: true },
         { shdlName: "ld[2]", pin: "J13", isInput: false, isOutput: true },
         { shdlName: "ld[3]", pin: "N14", isInput: false, isOutput: true },
         { shdlName: "ld[4]", pin: "R18", isInput: false, isOutput: true },
         { shdlName: "ld[5]", pin: "V17", isInput: false, isOutput: true },
         { shdlName: "ld[6]", pin: "U17", isInput: false, isOutput: true },
         { shdlName: "ld[7]", pin: "U16", isInput: false, isOutput: true },
         { shdlName: "ld[8]", pin: "V16", isInput: false, isOutput: true },
         { shdlName: "ld[9]", pin: "T15", isInput: false, isOutput: true },
         { shdlName: "ld[10]", pin: "U14", isInput: false, isOutput: true },
         { shdlName: "ld[11]", pin: "T16", isInput: false, isOutput: true },
         { shdlName: "ld[12]", pin: "V15", isInput: false, isOutput: true },
         { shdlName: "ld[13]", pin: "V14", isInput: false, isOutput: true },
         { shdlName: "ld[14]", pin: "V12", isInput: false, isOutput: true },
         { shdlName: "ld[15]", pin: "V11", isInput: false, isOutput: true },

         // 7-segs
         { shdlName: "an[0]", pin: "J17", isInput: false, isOutput: true },
         { shdlName: "an[1]", pin: "J18", isInput: false, isOutput: true },
         { shdlName: "an[2]", pin: "T9", isInput: false, isOutput: true },
         { shdlName: "an[3]", pin: "J14", isInput: false, isOutput: true },
         { shdlName: "an[4]", pin: "P14", isInput: false, isOutput: true },
         { shdlName: "an[5]", pin: "T14", isInput: false, isOutput: true },
         { shdlName: "an[6]", pin: "K2", isInput: false, isOutput: true },
         { shdlName: "an[7]", pin: "U13", isInput: false, isOutput: true },
         { shdlName: "ssg[0]", pin: "T10", isInput: false, isOutput: true },
         { shdlName: "ssg[1]", pin: "R10", isInput: false, isOutput: true },
         { shdlName: "ssg[2]", pin: "K16", isInput: false, isOutput: true },
         { shdlName: "ssg[3]", pin: "K13", isInput: false, isOutput: true },
         { shdlName: "ssg[4]", pin: "P15", isInput: false, isOutput: true },
         { shdlName: "ssg[5]", pin: "T11", isInput: false, isOutput: true },
         { shdlName: "ssg[6]", pin: "L18", isInput: false, isOutput: true },
         { shdlName: "dp", pin: "H15", isInput: false, isOutput: true },

         // Tri-color LD17
         { shdlName: "red1", pin: "N16", isInput: false, isOutput: true },
         { shdlName: "grn1", pin: "R11", isInput: false, isOutput: true },
         { shdlName: "blu1", pin: "G14", isInput: false, isOutput: true },
         // Tri-color LD18
         { shdlName: "red2", pin: "N15", isInput: false, isOutput: true },
         { shdlName: "grn2", pin: "M16", isInput: false, isOutput: true },
         { shdlName: "blu2", pin: "R12", isInput: false, isOutput: true },

         // UART
         // see https://github.com/Digilent/Nexys-A7-100T-GPIO.git
         { shdlName: "txd_in", pin: "C4", isInput: true, isOutput: false }, 
         { shdlName: "txd", pin: "D4", isInput: false, isOutput: true },
         { shdlName: "cts", pin: "D3", isInput: false, isOutput: true },
         { shdlName: "rds", pin: "E5", isInput: true, isOutput: false },

         // Pmod Header JA
         { shdlName: "ja1", pin: "C17", isInput: true, isOutput: true }, 
         { shdlName: "ja2", pin: "D18", isInput: true, isOutput: true }, 
         { shdlName: "ja3", pin: "E18", isInput: true, isOutput: true }, 
         { shdlName: "ja4", pin: "G17", isInput: true, isOutput: true }, 
         { shdlName: "ja7", pin: "D17", isInput: true, isOutput: true }, 
         { shdlName: "ja8", pin: "E17", isInput: true, isOutput: true }, 
         { shdlName: "ja9", pin: "F18", isInput: true, isOutput: true }, 
         { shdlName: "ja10", pin: "G18", isInput: true, isOutput: true }, 

         // Pmod Header JB
         { shdlName: "jb1", pin: "D14", isInput: true, isOutput: true }, 
         { shdlName: "jb2", pin: "F16", isInput: true, isOutput: true }, 
         { shdlName: "jb3", pin: "G16", isInput: true, isOutput: true }, 
         { shdlName: "jb4", pin: "H14", isInput: true, isOutput: true }, 
         { shdlName: "jb7", pin: "E16", isInput: true, isOutput: true }, 
         { shdlName: "jb8", pin: "F13", isInput: true, isOutput: true }, 
         { shdlName: "jb9", pin: "G13", isInput: true, isOutput: true }, 
         { shdlName: "jb10", pin: "H16", isInput: true, isOutput: true }, 

      ]
   },

   'nexys4': {
      name: "Digilent Nexys4",
      fpga: {
         vendor: 'Xilinx',
         family: 'Artix-7',
         type: 'XC7A100T',
         subtype: '1CSG324C',
         fullname: 'xc7a100tcsg324-1',
      },
      signals: [
         // master clock 100MHz
         { shdlName: "mclk", pin: "E3", isInput: true, isOutput: false },

         // buttons
         { shdlName: "btnc", pin: "E16", isInput: true, isOutput: false },
         { shdlName: "btnr", pin: "R10", isInput: true, isOutput: false },
         { shdlName: "btnl", pin: "T16", isInput: true, isOutput: false },
         { shdlName: "btnu", pin: "F15", isInput: true, isOutput: false },
         { shdlName: "btnd", pin: "V10", isInput: true, isOutput: false },

         // switches
         { shdlName: "sw[0]", pin: "U9", isInput: true, isOutput: false },
         { shdlName: "sw[1]", pin: "U8", isInput: true, isOutput: false },
         { shdlName: "sw[2]", pin: "R7", isInput: true, isOutput: false },
         { shdlName: "sw[3]", pin: "R6", isInput: true, isOutput: false },
         { shdlName: "sw[4]", pin: "R5", isInput: true, isOutput: false },
         { shdlName: "sw[5]", pin: "V7", isInput: true, isOutput: false },
         { shdlName: "sw[6]", pin: "V6", isInput: true, isOutput: false },
         { shdlName: "sw[7]", pin: "V5", isInput: true, isOutput: false },
         { shdlName: "sw[8]", pin: "U4", isInput: true, isOutput: false },
         { shdlName: "sw[9]", pin: "V2", isInput: true, isOutput: false },
         { shdlName: "sw[10]", pin: "U2", isInput: true, isOutput: false },
         { shdlName: "sw[11]", pin: "T3", isInput: true, isOutput: false },
         { shdlName: "sw[12]", pin: "T1", isInput: true, isOutput: false },
         { shdlName: "sw[13]", pin: "R3", isInput: true, isOutput: false },
         { shdlName: "sw[14]", pin: "P3", isInput: true, isOutput: false },
         { shdlName: "sw[15]", pin: "P4", isInput: true, isOutput: false },

         // leds
         { shdlName: "ld[0]", pin: "T8", isInput: false, isOutput: true },
         { shdlName: "ld[1]", pin: "V9", isInput: false, isOutput: true },
         { shdlName: "ld[2]", pin: "R8", isInput: false, isOutput: true },
         { shdlName: "ld[3]", pin: "T6", isInput: false, isOutput: true },
         { shdlName: "ld[4]", pin: "T5", isInput: false, isOutput: true },
         { shdlName: "ld[5]", pin: "T4", isInput: false, isOutput: true },
         { shdlName: "ld[6]", pin: "U7", isInput: false, isOutput: true },
         { shdlName: "ld[7]", pin: "U6", isInput: false, isOutput: true },
         { shdlName: "ld[8]", pin: "V4", isInput: false, isOutput: true },
         { shdlName: "ld[9]", pin: "U3", isInput: false, isOutput: true },
         { shdlName: "ld[10]", pin: "V1", isInput: false, isOutput: true },
         { shdlName: "ld[11]", pin: "R1", isInput: false, isOutput: true },
         { shdlName: "ld[12]", pin: "P5", isInput: false, isOutput: true },
         { shdlName: "ld[13]", pin: "U1", isInput: false, isOutput: true },
         { shdlName: "ld[14]", pin: "R2", isInput: false, isOutput: true },
         { shdlName: "ld[15]", pin: "P2", isInput: false, isOutput: true },

         // 7-segs
         { shdlName: "an[0]", pin: "N6", isInput: false, isOutput: true },
         { shdlName: "an[1]", pin: "M6", isInput: false, isOutput: true },
         { shdlName: "an[2]", pin: "M3", isInput: false, isOutput: true },
         { shdlName: "an[3]", pin: "N5", isInput: false, isOutput: true },
         { shdlName: "an[4]", pin: "N2", isInput: false, isOutput: true },
         { shdlName: "an[5]", pin: "N4", isInput: false, isOutput: true },
         { shdlName: "an[6]", pin: "L1", isInput: false, isOutput: true },
         { shdlName: "an[7]", pin: "M1", isInput: false, isOutput: true },
         { shdlName: "ssg[0]", pin: "L3", isInput: false, isOutput: true },
         { shdlName: "ssg[1]", pin: "N1", isInput: false, isOutput: true },
         { shdlName: "ssg[2]", pin: "L5", isInput: false, isOutput: true },
         { shdlName: "ssg[3]", pin: "L4", isInput: false, isOutput: true },
         { shdlName: "ssg[4]", pin: "K3", isInput: false, isOutput: true },
         { shdlName: "ssg[5]", pin: "M2", isInput: false, isOutput: true },
         { shdlName: "ssg[6]", pin: "L6", isInput: false, isOutput: true },
         { shdlName: "dp", pin: "M4", isInput: false, isOutput: true },

         // UART
         // see https://github.com/Digilent/Nexys-A7-100T-GPIO.git
         { shdlName: "txd_in", pin: "C4", isInput: true, isOutput: false }, 
         { shdlName: "txd", pin: "D4", isInput: false, isOutput: true },
         { shdlName: "cts", pin: "D3", isInput: false, isOutput: true },
         { shdlName: "rds", pin: "E5", isInput: true, isOutput: false },
      ]
   },

}
