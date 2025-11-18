import React, { useState } from "react";

export default function Timeline({ items }) {
    const [openStep, setOpenStep] = useState(null);

    const toggleStep = (id) => setOpenStep(openStep === id ? null : id);

    return (
        <div className="relative w-full py-10">
            {/* Vertical line */}
            <div className="absolute left-1/2 top-0 w-1 bg-indigo-600 h-full transform -translate-x-1/2"></div>

            {items.map((item, index) => {
                const isLeft = index % 2 === 0;

                return (
                    <div key={item.id} className="relative mb-16 flex items-center w-full">
                        {/* Title on left or right */}
                        <div className={`w-1/2 flex ${isLeft ? "justify-end pr-8" : "justify-start pl-8"}`}>
                            {isLeft && (
                                <div
                                    className={`bg-gray-800 p-4 rounded-xl border border-indigo-700 text-gray-100 cursor-pointer hover:bg-gray-700 transition`}
                                    onClick={() => toggleStep(item.id)}
                                >
                                    <strong>{item.title}</strong>
                                    {openStep === item.id && (
                                        <ul className="mt-2 list-disc list-inside text-gray-300">
                                            {item.description.map((d, i) => (
                                                <li key={i}>{d}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Circle */}
                        <div
                            onClick={() => toggleStep(item.id)}
                            className="z-10 w-16 h-16 rounded-full border-4 border-indigo-600 bg-gray-900 text-indigo-400 font-bold flex items-center justify-center cursor-pointer transition-all"
                        >
                            {item.id}
                        </div>

                        {/* Right side */}
                        <div className={`w-1/2 flex ${!isLeft ? "justify-start pl-8" : "justify-end pr-8"}`}>
                            {!isLeft && (
                                <div
                                    className={`bg-gray-800 p-4 rounded-xl border border-indigo-700 text-gray-100 cursor-pointer hover:bg-gray-700 transition`}
                                    onClick={() => toggleStep(item.id)}
                                >
                                    <strong>{item.title}</strong>
                                    {openStep === item.id && (
                                        <ul className="mt-2 list-disc list-inside text-gray-300">
                                            {item.description.map((d, i) => (
                                                <li key={i}>{d}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
