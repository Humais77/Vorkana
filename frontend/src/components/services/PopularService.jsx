import React from "react";
import { Link } from "react-router-dom";

const services = [
    {
        id: 1,
        name: "Website Development",
        image: "https://images.pexels.com/photos/1181673/pexels-photo-1181673.jpeg",
        bgColor: "bg-[#0A1A3D]",
        textColor: "text-white"
    },
    {
        id: 2,
        name: "Video Editing",
        image: "https://images.pexels.com/photos/277349/pexels-photo-277349.jpeg",
                bgColor: "bg-[#0A1A3D]",

        textColor: "text-white"
    },
    {
        id: 3,
        name: "Software Development",
        image: "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg",
                bgColor: "bg-[#0A1A3D]",

        textColor: "text-white"
    },
    {
        id: 4,
        name: "Book Publishing",
        image: "https://images.pexels.com/photos/316466/pexels-photo-316466.jpeg",
                bgColor: "bg-[#0A1A3D]",

        textColor: "text-white"
    },
    {
        id: 5,
        name: "Architecture & Interior Design",
        image: "https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg",
                bgColor: "bg-[#0A1A3D]",

        textColor: "text-white"
    },
    {
        id: 6,
        name: "Code with AI",
        image: "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg",
                bgColor: "bg-[#0A1A3D]",

        textColor: "text-white"
    },
    {
        id: 7,
        name: "Social Media Marketing",
        image: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg",
               bgColor: "bg-[#0A1A3D]",

        textColor: "text-white"
    },
    {
        id: 8,
        name: "Mobile App Development",
        image: "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg",
                bgColor: "bg-[#0A1A3D]",

        textColor: "text-white"
    },
];

const PopularServices = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            {/* Header */}
            <div className="mb-12">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                    Popular services
                </h1>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {services.map((service) => (
                    <Link
                        key={service.id}
                        to={`/services/${service.id}`}
                        className={`
                            ${service.bgColor}
                            ${service.textColor}
                            rounded-2xl
                            shadow-xl
                            overflow-hidden
                            group
                        `}
                    >
                        {/* Service Card Content */}
                        <div className="p-5 h-full flex flex-col">
                            {/* Service Name at Top */}
                            <div className="mb-4">
                                <h3 className="text-xl font-bold mb-1">
                                    {service.name}
                                </h3>
                                
                            </div>

                            {/* Image Card Inside */}
                            <div className="flex-grow">
                                <div className="
                                    bg-white
                                    rounded-xl
                                    overflow-hidden
                                    shadow-lg
                                   
                                    
                                    h-full
                                ">
                                    <div className="w-full h-48 overflow-hidden">
                                        <img
                                            src={service.image}
                                            alt={service.name}
                                            className="
                                                w-full
                                                h-full
                                                object-cover
                                              
                                            "
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

           
        </div>
    );
};

export default PopularServices;